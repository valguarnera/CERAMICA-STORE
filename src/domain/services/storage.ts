export interface StoredImage {
  id: string;
  originalPath: string;
  thumbnailPath: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

export interface UploadResult {
  id: string;
  originalUrl: string;
  thumbnailUrl: string;
}

export interface StorageService {
  save(file: Buffer, originalName: string, mimeType: string): Promise<UploadResult>;
  delete(id: string): Promise<void>;
  exists(id: string): Promise<boolean>;
  get(id: string): Promise<StoredImage | null>;
  listAll(): Promise<StoredImage[]>;
  listOrphaned(referencedIds: string[]): Promise<StoredImage[]>;
}