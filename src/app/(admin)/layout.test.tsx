import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import AdminLayout from './layout';

// Mock next/navigation redirect
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

// Mock getValidatedSession
vi.mock('@/lib/get-server-session', () => ({
  getValidatedSession: vi.fn(),
}));

import { redirect } from 'next/navigation';
import { getValidatedSession } from '@/lib/get-server-session';

describe('AdminLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects to / when no session', async () => {
    (getValidatedSession as any).mockResolvedValue(null);

    // Expect redirect to be called
    await expect(render(<AdminLayout><div>Child</div></AdminLayout>)).resolves.not.toThrow();
    // Since redirect throws, testing-library will catch? Actually redirect throws, so component won't render.
    // We'll just verify redirect called.
    expect(redirect).toHaveBeenCalledWith('/');
  });

  it('redirects to / when session role is not ADMIN', async () => {
    (getValidatedSession as any).mockResolvedValue({
      id: 'sid',
      userId: 'u1',
      email: 'cust@example.com',
      name: 'Customer',
      role: 'CUSTOMER',
      expiresAt: new Date(),
    });

    await expect(render(<AdminLayout><div>Child</div></AdminLayout>)).resolves.not.toThrow();
    expect(redirect).toHaveBeenCalledWith('/');
  });

  it('renders children when ADMIN session', async () => {
    (getValidatedSession as any).mockResolvedValue({
      id: 'sid',
      userId: 'u1',
      email: 'admin@example.com',
      name: 'Admin',
      role: 'ADMIN',
      expiresAt: new Date(),
    });

    const { container } = render(<AdminLayout><div data-testid="child">Admin Panel</div></AdminLayout>);
    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(redirect).not.toHaveBeenCalled();
  });
});