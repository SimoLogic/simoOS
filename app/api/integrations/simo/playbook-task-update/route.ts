// ⚠️ READ ARCHITECTURE.md §9 (SIMO IS) before modifying
// POST /api/integrations/simo/playbook-task-update
// Mirror Sync Protocol — Key #4
//
// RULE: Only update Playbook fields (title, description, dueDate, priority)
// NEVER: subtasks, comments, attachments, customFieldValues (employee property)
// Conflict in 'status' → log in SyncEvent, DO NOT overwrite

import { NextRequest, NextResponse } from "next/server";
import { verifyHmacSignature } from "@/lib/pmo/hmac";
import { mirrorSyncTask } from "@/lib/pmo/mirror-sync";
import { z } from "zod";

// ─── SCHEMA ZOD ───────────────────────────────────────────────────────────────

const MirrorSyncPayloadSchema = z.object({
  orgId:                 z.string().min(1),
  taskId:                z.string().optional(),
  sourcePlaybookTaskId:  z.string().optional(),
  occurrenceIndex:       z.number().int().min(0).optional(),
  title:                 z.string().min(1).max(255).optional(),
  description:           z.string().max(50000).optional(),
  dueDate:               z.string().optional(),
  priority:              z.enum(["low","medium","high","critical"]).optional(),
  status:                z.enum(["not_started","in_progress","done","stuck","pending_review"]).optional(),
}).refine(
  (d) => d.taskId || d.sourcePlaybookTaskId,
  { message: "Must provide taskId or sourcePlaybookTaskId" }
);

function errRes(msg: string, status: number) {
  return NextResponse.json({ error: msg }, { status });
}

// ─── ROUTE HANDLER ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  const rawBody = await req.text();

  // HMAC verification
  const secret = process.env.SIMO_IS_HMAC_SECRET;
  if (!secret) return errRes("Integration not configured", 500);

  const hmac = verifyHmacSignature(rawBody, req.headers.get("x-simo-signature"), secret);
  if (!hmac.valid) return errRes(`Unauthorized: ${hmac.reason}`, 401);

  // Idempotency-Key
  const idempotencyKey = req.headers.get("idempotency-key");
  if (!idempotencyKey) return errRes("Missing Idempotency-Key header", 400);

  // Parse + Zod validation
  let payload: z.infer<typeof MirrorSyncPayloadSchema>;
  try {
    payload = MirrorSyncPayloadSchema.parse(JSON.parse(rawBody));
  } catch (err) {
    if (err instanceof z.ZodError) return errRes(err.issues.map(i => i.message).join(", "), 422);
    return errRes("Invalid JSON body", 400);
  }

  // Mirror Sync
  const result = await mirrorSyncTask(payload, idempotencyKey);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  return NextResponse.json({
    status:         "synced",
    taskId:         result.taskId,
    syncedFields:   result.syncedFields,
    conflictsFound: result.conflictsFound,
    skippedFields:  result.skippedFields,
    idempotencyKey,
  }, { status: 200 });
}

export async function GET() {
  return errRes("Method not allowed", 405);
}
