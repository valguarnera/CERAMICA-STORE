import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/infrastructure/database';
import { AuthService } from '@/domain/services';
import { registerSchema } from '@/domain/schemas';
import { rateLimit } from '@/presentation/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';

    const rateLimitResult = rateLimit(`register:${ip}`, 3, 60000);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Demasiados intentos. Intente más tarde.' },
        { status: 429, headers: rateLimitResult.headers }
      );
    }

    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 400, headers: rateLimitResult.headers }
      );
    }

    const db = getDatabase();
    const authService = new AuthService(db);

    try {
      const result = await authService.register(parsed.data);

      const response = NextResponse.json(
        { user: result.user, redirect: result.redirect },
        { status: 201, headers: rateLimitResult.headers }
      );

      response.cookies.set('session_id', result.sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });

      return response;
    } catch (error) {
      if (error instanceof Error && error.message === 'EMAIL_EXISTS') {
        return NextResponse.json(
          { error: 'Email ya registrado' },
          { status: 409, headers: rateLimitResult.headers }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}