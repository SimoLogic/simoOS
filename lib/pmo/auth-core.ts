// ✅ EDGE RUNTIME SAFE — Only jwtVerify is imported (no compression APIs)
// For token SIGNING (Node-only), use @/lib/pmo/auth-server instead.
import { jwtVerify } from "jose";

export const JWT_SECRET = new TextEncoder().encode(
  process.env.SIMO_JWT_SECRET || "fallback-secret-for-development-only-change-in-prod"
);

export const ACCESS_TOKEN_NAME = "pmo_access_token";
export const REFRESH_TOKEN_NAME = "pmo_refresh_token";

export interface PmoSession {
  userId: string;
  orgId: string;
  userName: string;
  role: string;
}

export async function verifyToken(token: string): Promise<PmoSession | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as PmoSession;
  } catch {
    return null;
  }
}
