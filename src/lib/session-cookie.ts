import { SignJWT, jwtVerify } from 'jose';

const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) {
  throw new Error('SESSION_SECRET environment variable is required');
}

const encoder = new TextEncoder();
const secretKey = encoder.encode(SESSION_SECRET);

export interface SessionCookiePayload {
  sessionId: string;
  userId: string;
  role: 'ADMIN' | 'CUSTOMER';
  exp: number; // unix timestamp seconds
}

export async function signSessionCookie(
  payload: Omit<SessionCookiePayload, 'exp'>,
  ttlSeconds = 300
): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const jwt = await new SignJWT({ ...payload, exp })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(secretKey);
  return jwt;
}

export async function verifySessionCookie(
  token: string
): Promise<SessionCookiePayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ['HS256'],
    });
    return payload as unknown as SessionCookiePayload;
  } catch {
    return null;
  }
}