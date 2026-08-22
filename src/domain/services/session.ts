import type { Kysely } from 'kysely';
import type { Database } from '@/domain/db';
import { randomBytes } from 'crypto';

export interface SessionData {
  id: string;
  userId: string;
  email: string;
  name: string | null;
  role: 'ADMIN' | 'CUSTOMER';
  expiresAt: Date;
}

export interface CreateSessionResult {
  sessionId: string;
  expiresAt: Date;
}

function toISO(date: Date): string {
  return date.toISOString();
}

export class SessionService {
  constructor(private db: Kysely<Database>) {}

  generateSessionId(): string {
    return randomBytes(32).toString('hex');
  }

  async createSession(userId: string): Promise<CreateSessionResult> {
    const sessionId = this.generateSessionId();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const now = toISO(new Date());

    await this.db
      .insertInto('sessions')
      .values({
        id: sessionId,
        user_id: userId,
        expires_at: toISO(expiresAt),
        revoked: 0 as unknown as boolean,
        created_at: now,
      })
      .execute();

    return { sessionId, expiresAt };
  }

  async validateSession(sessionId: string): Promise<SessionData | null> {
    const now = toISO(new Date());
    const session = await this.db
      .selectFrom('sessions')
      .innerJoin('users', 'sessions.user_id', 'users.id')
      .select([
        'sessions.id',
        'users.id as userId',
        'users.email',
        'users.name',
        'users.role',
        'sessions.expires_at',
      ])
      .where('sessions.id', '=', sessionId)
      .where('sessions.revoked', '=', 0 as unknown as boolean)
      .where('sessions.expires_at', '>', now)
      .executeTakeFirst();

    if (!session) return null;

    return {
      id: session.id,
      userId: session.userId,
      email: session.email,
      name: session.name,
      role: session.role,
      expiresAt: new Date(session.expires_at),
    };
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.db
      .updateTable('sessions')
      .set({ revoked: 1 as unknown as boolean })
      .where('id', '=', sessionId)
      .execute();
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    await this.db
      .updateTable('sessions')
      .set({ revoked: 1 as unknown as boolean })
      .where('user_id', '=', userId)
      .execute();
  }

  async cleanupExpiredSessions(): Promise<number> {
    const now = toISO(new Date());
    const result = await this.db
      .deleteFrom('sessions')
      .where((eb) =>
        eb.or([
          eb('expires_at', '<', now),
          eb('revoked', '=', 1 as unknown as boolean),
        ])
      )
      .executeTakeFirst();

    return Number(result.numDeletedRows);
  }
}