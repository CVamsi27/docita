import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { StorageProvider, StorageFile } from './storage.provider';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import { nanoid } from 'nanoid';

@Injectable()
export class LocalStorageProvider extends StorageProvider {
  private readonly logger = new Logger(LocalStorageProvider.name);
  private readonly uploadDir = path.join(process.cwd(), 'uploads');

  constructor() {
    super();
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async upload(file: StorageFile, folder: string = 'general'): Promise<string> {
    const destDir = path.join(this.uploadDir, folder);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${nanoid()}${ext}`;
    const filePath = path.join(destDir, filename);

    try {
      // Security: Validate image and strip metadata using sharp
      if (file.mimetype.startsWith('image/')) {
        const buffer = file.buffer || fs.readFileSync(file.path!);
        await sharp(buffer)
          .rotate() // Auto-orient based on EXIF
          .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
          .toFile(filePath);
      } else {
        // Fallback for non-images (if ever allowed)
        if (file.path) {
          fs.renameSync(file.path, filePath);
        } else if (file.buffer) {
          fs.writeFileSync(filePath, file.buffer);
        }
      }

      // Return a relative URL or path
      // In a real app, this would be served by static middleware
      return `/uploads/${folder}/${filename}`;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to upload file: ${errorMsg}`);
      throw new BadRequestException('Invalid file format or upload failed');
    }
  }

  async delete(url: string): Promise<void> {
    // Convert URL back to path
    const relativePath = url.replace(/^\/uploads\//, '');
    const filePath = path.join(this.uploadDir, relativePath);

    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  }
}
