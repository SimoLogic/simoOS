// ⚠️ NODE-ONLY — DO NOT IMPORT FROM MIDDLEWARE OR EDGE ROUTES
// auth-server.ts — Token signing functions that use Node.js crypto features via jose
// Only safe to use in: app/api/**, app/actions/**, lib/services/**

import { SignJWT } from "jose";
import { JWT_SECRET, PmoSession } from "./auth-core";

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
