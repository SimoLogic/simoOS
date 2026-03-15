import { jwtVerify, SignJWT } from "jose";

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

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as PmoSession;
  } catch (err) {
    return null;
  }
}

export async function signAccessToken(session: PmoSession): Promise<string> {
  return await new SignJWT({ ...session })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(JWT_SECRET);
}

export async function signRefreshToken(session: PmoSession): Promise<string> {
  return await new SignJWT({ userId: session.userId, orgId: session.orgId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}
