import { describe, it, expect, beforeEach } from 'vitest';
import { Kysely, SqliteDialect } from 'kysely';
import Database from 'better-sqlite3';
import type { Database as DatabaseType } from '@/domain/db';
import { AuthService } from './auth';
import { SessionService } from './session';

function createTestDb(): Kysely<DatabaseType> {
  const sqlite = new Database(':memory:');
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  const db = new Kysely<DatabaseType>({
    dialect: new SqliteDialect({ database: sqlite }),
  });

  const schema = `
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'CUSTOMER' CHECK (role IN ('ADMIN', 'CUSTOMER')),
      name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      revoked BOOLEAN DEFAULT 0 CHECK (revoked IN (0, 1)),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX idx_sessions_user ON sessions(user_id);
    CREATE INDEX idx_sessions_expires ON sessions(expires_at);
  `;

  sqlite.exec(schema);
  return db;
}

describe('AuthService', () => {
  let db: Kysely<DatabaseType>;
  let authService: AuthService;

  beforeEach(() => {
    db = createTestDb();
    authService = new AuthService(db);
  });

  afterEach(async () => {
    await db.destroy();
  });

  it('primer registro → ADMIN', async () => {
    const result = await authService.register({
      email: 'admin@test.com',
      password: 'password123',
      name: 'Admin User',
    });

    expect(result.user.role).toBe('ADMIN');
    expect(result.user.email).toBe('admin@test.com');
    expect(result.user.name).toBe('Admin User');
    expect(result.redirect).toBe('/admin');
    expect(result.sessionId).toBeDefined();
  });

  it('registros posteriores → CUSTOMER', async () => {
    await authService.register({
      email: 'admin@test.com',
      password: 'password123',
      name: 'Admin User',
    });

    const result = await authService.register({
      email: 'customer@test.com',
      password: 'password123',
      name: 'Customer User',
    });

    expect(result.user.role).toBe('CUSTOMER');
    expect(result.redirect).toBe('/');
  });

  it('concurrencia registro: solo un ADMIN', async () => {
    const results = await Promise.allSettled([
      authService.register({ email: 'a@b.com', password: '12345678', name: 'A' }),
      authService.register({ email: 'c@d.com', password: '12345678', name: 'B' }),
    ]);

    const admins = results.filter(
      (r): r is PromiseFulfilledResult<any> =>
        r.status === 'fulfilled' && r.value.user.role === 'ADMIN'
    );
    expect(admins.length).toBe(1);
  });

  it('registro con email duplicado falla', async () => {
    await authService.register({
      email: 'test@test.com',
      password: 'password123',
      name: 'Test',
    });

    await expect(
      authService.register({
        email: 'test@test.com',
        password: 'password123',
        name: 'Test2',
      })
    ).rejects.toThrow('EMAIL_EXISTS');
  });

  it('login válido crea sesión y cookie', async () => {
    // Create admin user first
    await authService.register({
      email: 'admin@test.com',
      password: 'password123',
      name: 'Admin',
    });

    // Create customer user
    await authService.register({
      email: 'test@test.com',
      password: 'password123',
      name: 'Test',
    });

    const result = await authService.login({
      email: 'test@test.com',
      password: 'password123',
    });

    expect(result.user.email).toBe('test@test.com');
    expect(result.user.role).toBe('CUSTOMER');
    expect(result.sessionId).toBeDefined();
    expect(result.redirect).toBe('/');
  });

  it('login con password incorrecta falla', async () => {
    // Create admin user first
    await authService.register({
      email: 'admin@test.com',
      password: 'password123',
      name: 'Admin',
    });

    // Create customer user
    await authService.register({
      email: 'test@test.com',
      password: 'password123',
      name: 'Test',
    });

    await expect(
      authService.login({
        email: 'test@test.com',
        password: 'wrongpassword',
      })
    ).rejects.toThrow('INVALID_CREDENTIALS');
  });

  it('login con usuario inexistente falla (timing safe)', async () => {
    await expect(
      authService.login({
        email: 'nonexistent@test.com',
        password: 'password123',
      })
    ).rejects.toThrow('INVALID_CREDENTIALS');
  });

  it('logout revoca sesión', async () => {
    // Create admin user first
    await authService.register({
      email: 'admin@test.com',
      password: 'password123',
      name: 'Admin',
    });

    const registerResult = await authService.register({
      email: 'test@test.com',
      password: 'password123',
      name: 'Test',
    });

    await authService.logout(registerResult.sessionId);

    const session = await authService.validateSession(registerResult.sessionId);
    expect(session).toBeNull();
  });

  it('validar sesión inexistente retorna null', async () => {
    const session = await authService.validateSession('nonexistent-session-id');
    expect(session).toBeNull();
  });

it('validar sesión expirada retorna null', async () => {
    const db2 = createTestDb();
    const sessionService = new SessionService(db2);

    // First create a user
    const userId = 'test-user-id';
    await db2
      .insertInto('users')
      .values({
        id: userId,
        email: 'test@test.com',
        password_hash: 'hash',
        role: 'CUSTOMER',
        name: 'Test',
      })
      .execute();

    const sessionId = sessionService.generateSessionId();
    const expiredDate = new Date(Date.now() - 1000).toISOString();

    await db2
      .insertInto('sessions')
      .values({
        id: sessionId,
        user_id: userId,
        expires_at: expiredDate,
        revoked: 0,
      })
      .execute();

    const authServiceWithExpired = new AuthService(db2);
    const session = await authServiceWithExpired.validateSession(sessionId);
    expect(session).toBeNull();

    await db2.destroy();
  });
});