// ⚠️ LEER ARCHITECTURE.md §9 (SIMO IS) ANTES DE MODIFICAR
// POST /api/integrations/simo/playbook-assignment
//
// PIPELINE DE SEGURIDAD (en orden):
//   1. Verificar HMAC-SHA256 (X-Simo-Signature) — rechazar 401 si inválido
//   2. Verificar Idempotency-Key — retornar 200 cached si ya procesado
//   3. Zod validation del payload
//   4. Procesar sincrónicamente (BullMQ añadido en Sprint 4 cuando Redis esté listo)
//   5. Registrar SyncEvent

import { NextRequest, NextResponse } from "next/server";
import { verifyHmacSignature } from "@/lib/pmo/hmac";
import {
  processPlaybookAssignment,
  PlaybookAssignmentSchema,
} from "@/lib/pmo/playbook-processor";
import { getPmoDB } from "@/lib/pmo/pmo-db";
import { z } from "zod";

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function err(msg: string, status: number) {
  return NextResponse.json({ error: msg }, { status });
}

// ─── IDEMPOTENCIA: Verificar en pmo_sync_events ───────────────────────────────

async function checkIdempotency(
  idempotencyKey: string,
  orgId: string
): Promise<{ exists: boolean; cachedResponse?: Record<string, unknown> }> {
  const db = getPmoDB();
  const { data } = await db
    .from("pmo_sync_events")
    .select("status, payload")
    .eq("idempotency_key", idempotencyKey)
    .eq("org_id", orgId)
    .limit(1)
    .single();

  if (!data) return { exists: false };
  return {
    exists: true,
    cachedResponse: {
      status:       data.status,
      idempotent:   true,
      originalData: data.payload,
    },
  };
}

// ─── ROUTE HANDLER ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  // ── 1. Leer body raw (necesario ANTES de parsear JSON para HMAC) ────────────
  const rawBody = await req.text();

  // ── 2. Verificar HMAC-SHA256 ──────────────────────────────────────────────
  const secret = process.env.SIMO_IS_HMAC_SECRET;
  if (!secret) {
    console.error("[Simo Endpoint] SIMO_IS_HMAC_SECRET not configured");
    return err("Integration not configured", 500);
  }

  const signature = req.headers.get("x-simo-signature");
  const hmacResult = verifyHmacSignature(rawBody, signature, secret);

  if (!hmacResult.valid) {
    console.warn("[Simo Endpoint] HMAC verification failed:", hmacResult.reason);
    return err(`Unauthorized: ${hmacResult.reason}`, 401);
  }

  // ── 3. Verificar Idempotency-Key ──────────────────────────────────────────
  const idempotencyKey = req.headers.get("idempotency-key");
  if (!idempotencyKey) {
    return err("Missing Idempotency-Key header", 400);
  }

  // ── 4. Parsear y validar payload ──────────────────────────────────────────
  let payload: z.infer<typeof PlaybookAssignmentSchema>;
  try {
    const json = JSON.parse(rawBody);
    payload = PlaybookAssignmentSchema.parse(json);
  } catch (parseErr) {
    if (parseErr instanceof z.ZodError) {
      return err(`Validation error: ${parseErr.issues.map(i => i.message).join(", ")}`, 422);
    }
    return err("Invalid JSON body", 400);
  }

  // ── 5. Verificar Idempotencia en DB ───────────────────────────────────────
  const idempotencyCheck = await checkIdempotency(idempotencyKey, payload.orgId);
  if (idempotencyCheck.exists) {
    console.info("[Simo Endpoint] Idempotent response for key:", idempotencyKey);
    return NextResponse.json({
      status:    "already_processed",
      idempotencyKey,
      ...idempotencyCheck.cachedResponse,
    }, { status: 200 });
  }

  // ── 6. Procesar Playbook Assignment ───────────────────────────────────────
  // Sprint 4: Mover a BullMQ queue para procesamiento asíncrono
  // Por ahora: procesamiento síncrono con respuesta inmediata
  try {
    const result = await processPlaybookAssignment(payload);

    if (!result.success && result.errors.length > 0) {
      return NextResponse.json({
        status:       "failed",
        assignmentId: result.assignmentId,
        playbookId:   result.playbookId,
        errors:       result.errors,
      }, { status: 500 });
    }

    return NextResponse.json({
      status:       "completed",
      assignmentId: result.assignmentId,
      playbookId:   result.playbookId,
      tasksCreated: result.tasksCreated,
      tasksSkipped: result.tasksSkipped,
      groupId:      result.groupId,
      idempotencyKey,
    }, { status: 201 });

  } catch (processingErr) {
    console.error("[Simo Endpoint] Processing error:", processingErr);
    return err(`Processing failed: ${(processingErr as Error).message}`, 500);
  }
}

// Solo acepta POST — rechazar otros métodos explícitamente
export async function GET() {
  return err("Method not allowed", 405);
}
