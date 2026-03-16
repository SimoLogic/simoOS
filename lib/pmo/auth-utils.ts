import { cookies } from "next/headers";
import { 
  ACCESS_TOKEN_NAME, 
  REFRESH_TOKEN_NAME, 
  PmoSession, 
  verifyToken, 
} from "./auth-core";
import { signAccessToken, signRefreshToken } from "./auth-server";

/**
 * getServerSession - Retrieves session from cookies in Server Actions/Components
 */
export async function getServerSession(): Promise<PmoSession | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(ACCESS_TOKEN_NAME);

  if (!token) return null;

  return await verifyToken(token.value);
}

/**
 * getRequiredSession - Throws 403 if session is missing (for Server Actions)
 */
export async function getRequiredSession(): Promise<PmoSession> {
  const session = await getServerSession();
  if (!session) {
    throw new Error("UNAUTHORIZED_PMO_SESSION");
  }
  return session;
}

/**
 * setSessionCookies - Helper for login/refresh
 */
export async function setSessionCookies(session: PmoSession) {
  const accessToken = await signAccessToken(session);
  const refreshToken = await signRefreshToken(session);
  const cookieStore = cookies();

  cookieStore.set(ACCESS_TOKEN_NAME, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 15 * 60, // 15 mins
  });

  cookieStore.set(REFRESH_TOKEN_NAME, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
}

/**
 * clearSessionCookies
 */
export async function clearSessionCookies() {
  const cookieStore = cookies();
  cookieStore.delete(ACCESS_TOKEN_NAME);
  cookieStore.delete(REFRESH_TOKEN_NAME);
}
