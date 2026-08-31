import { NextRequest, NextResponse } from 'next/server';
import { LocalFileStorage } from '@/infrastructure/storage/local-file-storage';

export const runtime = 'nodejs';

const storage = new LocalFileStorage();

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    const exists = await storage.exists(id);
    if (!exists) {
      return NextResponse.json({ error: 'Imagen no encontrada' }, { status: 404 });
    }

    await storage.delete(id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Storage delete error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}