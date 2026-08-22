import { getRawDatabase } from '@/infrastructure/database';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const rawDb = getRawDatabase();
    if (rawDb) {
      rawDb.prepare('SELECT name FROM sqlite_master LIMIT 1').get();
    }
    return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json(
      { status: 'error', error: String(e) },
      { status: 503 }
    );
  }
}