import { NextRequest, NextResponse } from 'next/server';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 2 * 1024 * 1024; // 2 MB
const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads', 'products');

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const files = form.getAll('files') as File[];

    if (!files.length) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    mkdirSync(UPLOAD_DIR, { recursive: true });

    const urls: string[] = [];

    for (const file of files) {
      if (!ALLOWED_MIME.includes(file.type)) {
        return NextResponse.json({ error: `Tipo de archivo no permitido: ${file.type}` }, { status: 400 });
      }
      if (file.size > MAX_SIZE) {
        return NextResponse.json({ error: `Archivo demasiado grande: ${file.name}` }, { status: 400 });
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const ext = file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/png' ? 'png' : 'webp';
      const filename = `${randomUUID()}.${ext}`;
      const filepath = join(UPLOAD_DIR, filename);
      writeFileSync(filepath, buffer);
      urls.push(`/uploads/products/${filename}`);
    }

    return NextResponse.json({ urls });
  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}