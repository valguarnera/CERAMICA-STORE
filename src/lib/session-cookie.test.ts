import { describe, it, expect, vi } from 'vitest';

describe('session-cookie', () => {
  async function loadModule() {
    vi.stubEnv('SESSION_SECRET', 'test-secret-key-at-least-32-chars-long!!');
    const mod = await import('./session-cookie');
    return { signSessionCookie: mod.signSessionCookie, verifySessionCookie: mod.verifySessionCookie };
  }

  it('signs and verifies a cookie payload', async () => {
    const { signSessionCookie, verifySessionCookie } = await loadModule();
    const payload = {
      sessionId: 'sess-123',
      userId: 'user-456',
      role: 'ADMIN' as const,
    };
    const token = await signSessionCookie(payload, 300);
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3);

    const verified = await verifySessionCookie(token);
    expect(verified).not.toBeNull();
    expect(verified?.sessionId).toBe(payload.sessionId);
    expect(verified?.userId).toBe(payload.userId);
    expect(verified?.role).toBe(payload.role);
    expect(typeof verified?.exp).toBe('number');
  });

  it('rejects tampered token', async () => {
    const { signSessionCookie, verifySessionCookie } = await loadModule();
    const payload = {
      sessionId: 'sess-123',
      userId: 'user-456',
      role: 'CUSTOMER' as const,
    };
    const token = await signSessionCookie(payload, 300);
    const tampered = token.slice(0, -5) + 'abcde';
    const verified = await verifySessionCookie(tampered);
    expect(verified).toBeNull();
  });

  it('rejects expired token', async () => {
    const { signSessionCookie, verifySessionCookie } = await loadModule();
    const payload = {
      sessionId: 'sess-123',
      userId: 'user-456',
      role: 'ADMIN' as const,
    };
    const token = await signSessionCookie(payload, 0);
    await new Promise(r => setTimeout(r, 10));
    const verified = await verifySessionCookie(token);
    expect(verified).toBeNull();
  });
});