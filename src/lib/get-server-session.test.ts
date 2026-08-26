import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getValidatedSession } from './get-server-session';

// Mock dependencies
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

vi.mock('@/lib/session-cookie', () => ({
  verifySessionCookie: vi.fn(),
}));

vi.mock('@/infrastructure/database', () => ({
  getDatabase: vi.fn(),
}));

vi.mock('@/domain/services', () => ({
  SessionService: vi.fn().mockImplementation(() => ({
    validateSession: vi.fn(),
  })),
}));

import { cookies } from 'next/headers';
import { verifySessionCookie } from '@/lib/session-cookie';
import { getDatabase } from '@/infrastructure/database';
import { SessionService } from '@/domain/services';

describe('getValidatedSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when no cookie', async () => {
    (cookies as any).mockResolvedValue({ get: () => undefined });

    const result = await getValidatedSession();
    expect(result).toBeNull();
  });

  it('returns null when JWT verification fails', async () => {
    (cookies as any).mockResolvedValue({ get: () => ({ value: 'invalid-jwt' }) });
    (verifySessionCookie as any).mockResolvedValue(null);

    const result = await getValidatedSession();
    expect(result).toBeNull();
  });

  it('returns null when session not found in DB', async () => {
    (cookies as any).mockResolvedValue({ get: () => ({ value: 'valid-jwt' }) });
    (verifySessionCookie as any).mockResolvedValue({ sessionId: 'sid-123', userId: 'u1', role: 'ADMIN', exp: Math.floor(Date.now()/1000)+300 });
    const mockValidate = vi.fn().mockResolvedValue(null);
    (SessionService as any).mockImplementation(() => ({ validateSession: mockValidate }));
    (getDatabase as any).mockReturnValue({});

    const result = await getValidatedSession();
    expect(result).toBeNull();
    expect(mockValidate).toHaveBeenCalledWith('sid-123');
  });

  it('returns session data when valid', async () => {
    const sessionData = {
      id: 'sid-123',
      userId: 'u1',
      email: 'admin@example.com',
      name: 'Admin',
      role: 'ADMIN' as const,
      expiresAt: new Date(Date.now() + 1000*60*60),
    };
    (cookies as any).mockResolvedValue({ get: () => ({ value: 'valid-jwt' }) });
    (verifySessionCookie as any).mockResolvedValue({ sessionId: 'sid-123', userId: 'u1', role: 'ADMIN', exp: Math.floor(Date.now()/1000)+300 });
    const mockValidate = vi.fn().mockResolvedValue(sessionData);
    (SessionService as any).mockImplementation(() => ({ validateSession: mockValidate }));
    (getDatabase as any).mockReturnValue({});

    const result = await getValidatedSession();
    expect(result).toEqual(sessionData);
    expect(result?.role).toBe('ADMIN');
  });

  it('returns session data with CUSTOMER role', async () => {
    const sessionData = {
      id: 'sid-456',
      userId: 'u2',
      email: 'customer@example.com',
      name: 'Customer',
      role: 'CUSTOMER' as const,
      expiresAt: new Date(Date.now() + 1000*60*60),
    };
    (cookies as any).mockResolvedValue({ get: () => ({ value: 'valid-jwt' }) });
    (verifySessionCookie as any).mockResolvedValue({ sessionId: 'sid-456', userId: 'u2', role: 'CUSTOMER', exp: Math.floor(Date.now()/1000)+300 });
    const mockValidate = vi.fn().mockResolvedValue(sessionData);
    (SessionService as any).mockImplementation(() => ({ validateSession: mockValidate }));
    (getDatabase as any).mockReturnValue({});

    const result = await getValidatedSession();
    expect(result).toEqual(sessionData);
    expect(result?.role).toBe('CUSTOMER');
  });
});