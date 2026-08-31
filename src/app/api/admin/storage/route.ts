import { NextResponse } from 'next/server';
import { getDatabase } from '@/infrastructure/database';
import { LocalFileStorage } from '@/infrastructure/storage/local-file-storage';
import { ProductService } from '@/domain/services';

export const runtime = 'nodejs';

const storage = new LocalFileStorage();

export async function GET() {
  try {
    const db = getDatabase();
    const productService = new ProductService(db);

    // Get all referenced image IDs from products
    const products = await productService.adminFindMany({ pageSize: 1000, active: null });
    const referencedIds = new Set<string>();
    for (const product of products.products) {
      if (!product.images) continue;
      try {
        const images = JSON.parse(product.images);
        for (const img of images) {
          if (typeof img === 'string') {
            // Old format: just URL
            const id = img.split('/').pop()?.split('.')[0];
            if (id) referencedIds.add(id);
          } else if (img && typeof img === 'object' && 'id' in img) {
            // New format: { id, original, thumbnail }
            const imgObj = img as { id: string; original: string; thumbnail: string };
            if (imgObj.id) referencedIds.add(imgObj.id);
          }
        }
      } catch {
        // ignore parse errors
      }
    }

    // Get all stored images
    const allImages = await storage.listAll();

    // Mark images as referenced or orphaned
    const imagesWithStatus = allImages.map(img => ({
      ...img,
      referenced: referencedIds.has(img.id),
      productCount: 0, // Could be enhanced to count references
    }));

    return NextResponse.json({ images: imagesWithStatus });
  } catch (error) {
    console.error('Storage list error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}