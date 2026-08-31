import { NextRequest, NextResponse } from 'next/server';
import { LocalFileStorage } from '@/infrastructure/storage/local-file-storage';

export const runtime = 'nodejs';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 2 * 1024 * 1024; // 2 MB

const storage = new LocalFileStorage();

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const files = form.getAll('files') as File[];

    if (!files.length) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    const results: { id: string; original: string; thumbnail: string }[] = [];

    for (const file of files) {
      if (!ALLOWED_MIME.includes(file.type)) {
        return NextResponse.json({ error: `Tipo de archivo no permitido: ${file.type}` }, { status: 400 });
      }
      if (file.size > MAX_SIZE) {
        return NextResponse.json({ error: `Archivo demasiado grande: ${file.name}` }, { status: 400 });
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const result = await storage.save(buffer, file.name, file.type);
      results.push({
        id: result.id,
        original: result.originalUrl,
        thumbnail: result.thumbnailUrl,
      });
    }

    return NextResponse.json({ images: results });
  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}