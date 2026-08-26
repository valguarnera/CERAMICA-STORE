import { cookies } from 'next/headers';
import { verifySessionCookie } from '@/lib/session-cookie';
import { SessionService } from '@/domain/services';
import { getDatabase } from '@/infrastructure/database';
import type { SessionData } from '@/domain/services/session';

export async function getValidatedSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const jwt = cookieStore.get('session_id')?.value;
  if (!jwt) return null;

  const payload = await verifySessionCookie(jwt);
  if (!payload) return null;

  const db = getDatabase();
  const sessionService = new SessionService(db);
  return sessionService.validateSession(payload.sessionId);
}