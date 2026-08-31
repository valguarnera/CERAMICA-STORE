import { mkdirSync, writeFileSync, rmSync, existsSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';
import { randomUUID } from 'crypto';
import sharp from 'sharp';
import type { StorageService, StoredImage, UploadResult } from '@/domain/services/storage';

const UPLOAD_BASE_DIR = join(process.cwd(), 'public', 'uploads', 'products');
const THUMBNAIL_WIDTH = 300;

function getDateFolder(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getImageDir(imageId: string): string {
  const dateFolder = getDateFolder();
  return join(UPLOAD_BASE_DIR, dateFolder, imageId);
}

export class LocalFileStorage implements StorageService {
  async save(file: Buffer, originalName: string, mimeType: string): Promise<UploadResult> {
    const id = randomUUID();
    const imageDir = getImageDir(id);

    mkdirSync(imageDir, { recursive: true });

    const ext = mimeType === 'image/jpeg' ? 'jpg' : mimeType === 'image/png' ? 'png' : 'webp';
    const originalFilename = `original.${ext}`;
    const thumbnailFilename = 'thumbnail.webp';

    const originalPath = join(imageDir, originalFilename);
    const thumbnailPath = join(imageDir, thumbnailFilename);

    writeFileSync(originalPath, file);

    await sharp(file)
      .resize({ width: THUMBNAIL_WIDTH, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(thumbnailPath);

    const dateFolder = getDateFolder();
    return {
      id,
      originalUrl: `/uploads/products/${dateFolder}/${id}/${originalFilename}`,
      thumbnailUrl: `/uploads/products/${dateFolder}/${id}/${thumbnailFilename}`,
    };
  }

  async delete(id: string): Promise<void> {
    const imageDir = this.findImageDir(id);
    if (imageDir && existsSync(imageDir)) {
      rmSync(imageDir, { recursive: true, force: true });
    }
  }

  async exists(id: string): Promise<boolean> {
    const imageDir = this.findImageDir(id);
    return imageDir !== null && existsSync(imageDir);
  }

  async get(id: string): Promise<StoredImage | null> {
    const imageDir = this.findImageDir(id);
    if (!imageDir || !existsSync(imageDir)) return null;

    const files = readdirSync(imageDir);
    const originalFile = files.find(f => f.startsWith('original.'));
    const thumbnailFile = files.find(f => f === 'thumbnail.webp' || f.startsWith('thumb_'));

    if (!originalFile) return null;

    const originalPath = join(imageDir, originalFile);
    const stats = statSync(originalPath);
    const ext = extname(originalFile).slice(1);
    const mimeType = ext === 'jpg' ? 'image/jpeg' : ext === 'png' ? 'image/png' : 'image/webp';

    const dateFolder = getDateFolder();
    return {
      id,
      originalPath: `/uploads/products/${dateFolder}/${id}/${originalFile}`,
      thumbnailPath: thumbnailFile ? `/uploads/products/${dateFolder}/${id}/${thumbnailFile}` : `/uploads/products/${dateFolder}/${id}/${originalFile}`,
      originalName: originalFile,
      mimeType,
      size: stats.size,
      createdAt: stats.birthtime.toISOString(),
    };
  }

  async listAll(): Promise<StoredImage[]> {
    const result: StoredImage[] = [];
    if (!existsSync(UPLOAD_BASE_DIR)) return result;

    const dateFolders = readdirSync(UPLOAD_BASE_DIR);
    for (const dateFolder of dateFolders) {
      const datePath = join(UPLOAD_BASE_DIR, dateFolder);
      if (!statSync(datePath).isDirectory()) continue;

      const idFolders = readdirSync(datePath);
      for (const id of idFolders) {
        const image = await this.get(id);
        if (image) result.push(image);
      }
    }
    return result;
  }

  async listOrphaned(referencedIds: string[]): Promise<StoredImage[]> {
    const allImages = await this.listAll();
    const referencedSet = new Set(referencedIds);
    return allImages.filter(img => !referencedSet.has(img.id));
  }

  private findImageDir(id: string): string | null {
    if (!existsSync(UPLOAD_BASE_DIR)) return null;

    const dateFolders = readdirSync(UPLOAD_BASE_DIR);
    for (const dateFolder of dateFolders) {
      const datePath = join(UPLOAD_BASE_DIR, dateFolder);
      if (!statSync(datePath).isDirectory()) continue;

      const idPath = join(datePath, id);
      if (existsSync(idPath) && statSync(idPath).isDirectory()) {
        return idPath;
      }
    }
    return null;
  }
}