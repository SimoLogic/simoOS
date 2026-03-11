// ⚠️ LEER ARCHITECTURE.md §9 (SIMO IS INTEGRATION) antes de modificar
// hmac.ts — Utilidades HMAC-SHA256 para autenticación con Simo Intellisense
//
// Usado por:
//   - Receptor HMAC (entrante): verifyHmacSignature()
//   - Webhooks salientes: signOutgoingPayload()
//
// Estándar: firma en header 'X-Simo-Signature' con formato 'sha256=<hex>'
// (idéntico al estándar de GitHub webhooks para familiaridad)

import { createHmac, timingSafeEqual } from "crypto";

// ─── TIPOS ────────────────────────────────────────────────────────────────────

export interface HmacVerifyResult {
  valid:   boolean;
  reason?: string;
}

/**
 * signPayload — Genera una firma HMAC-SHA256 para un payload.
 * Formato de salida: 'sha256=<hex_digest>'
 *
 * @param body   - Body crudo (string o Buffer)
 * @param secret - Secreto compartido con Simo IS (SIMO_IS_HMAC_SECRET)
 */
export function signPayload(body: string | Buffer, secret: string): string {
  const hmac = createHmac("sha256", secret);
  hmac.update(typeof body === "string" ? body : body);
  return `sha256=${hmac.digest("hex")}`;
}

/**
 * verifyHmacSignature — Verifica la firma del header X-Simo-Signature.
 *
 * Usa `timingSafeEqual` para prevenir timing attacks.
 * NUNCA comparar strings de firma directamente con ===
 *
 * @param rawBody   - Body crudo recibido en el request (antes de parsear JSON)
 * @param signature - Valor del header X-Simo-Signature
 * @param secret    - SIMO_IS_HMAC_SECRET del entorno
 *
 * @example
 * const result = verifyHmacSignature(rawBody, req.headers['x-simo-signature'], process.env.SIMO_IS_HMAC_SECRET!);
 * if (!result.valid) return Response.json({ error: result.reason }, { status: 401 });
 */
export function verifyHmacSignature(
  rawBody:   string | Buffer,
  signature: string | null | undefined,
  secret:    string
): HmacVerifyResult {
  if (!signature) {
    return { valid: false, reason: "Missing X-Simo-Signature header" };
  }

  if (!signature.startsWith("sha256=")) {
    return { valid: false, reason: "Invalid signature format — expected 'sha256=<hex>'" };
  }

  const expectedSig = signPayload(rawBody, secret);

  try {
    const sigBuf      = Buffer.from(signature,   "utf8");
    const expectedBuf = Buffer.from(expectedSig, "utf8");

    if (sigBuf.length !== expectedBuf.length) {
      return { valid: false, reason: "Signature length mismatch" };
    }

    const isValid = timingSafeEqual(sigBuf, expectedBuf);
    return isValid
      ? { valid: true }
      : { valid: false, reason: "Signature mismatch" };

  } catch {
    return { valid: false, reason: "Signature comparison failed" };
  }
}

/**
 * signOutgoingPayload — Firma un payload saliente para webhooks hacia Simo IS.
 * Usar en outgoing-webhook.ts para cada llamada hacia Simo IS.
 *
 * @param payload - Objeto a enviar (se serializa a JSON)
 * @param secret  - SIMO_IS_HMAC_SECRET
 * @returns { body: string, signature: string } — body serializado + firma para header
 */
export function signOutgoingPayload(
  payload: Record<string, unknown>,
  secret:  string
): { body: string; signature: string } {
  const body      = JSON.stringify(payload);
  const signature = signPayload(body, secret);
  return { body, signature };
}
