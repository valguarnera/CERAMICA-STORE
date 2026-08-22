import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/infrastructure/database';
import { AuthService } from '@/domain/services';
import { rateLimit } from '@/presentation/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const sessionId = request.cookies.get('session_id')?.value;

    const rateLimitKey = sessionId ? `logout:${sessionId}` : `logout:anonymous`;
    const rateLimitResult = rateLimit(rateLimitKey, 30, 60000);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Demasiados intentos. Intente más tarde.' },
        { status: 429, headers: rateLimitResult.headers }
      );
    }

    if (sessionId) {
      const db = getDatabase();
      const authService = new AuthService(db);
      await authService.logout(sessionId);
    }

    const response = NextResponse.json(
      { ok: true },
      { status: 200, headers: rateLimitResult.headers }
    );

    response.cookies.delete('session_id');

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}