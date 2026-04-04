import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import {
  StorageProvider,
  StorageFile,
  StorageUploadOptions,
} from './storage.provider';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import { nanoid } from 'nanoid';

@Injectable()
export class LocalStorageProvider extends StorageProvider {
  readonly supportsSignedUrls = false;

  private readonly logger = new Logger(LocalStorageProvider.name);
  private readonly uploadDir = path.join(process.cwd(), 'uploads');

  constructor() {
    super();
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  private resolveSafeUploadPath(rawPath: string): string {
    const decoded = decodeURIComponent(rawPath).trim();
    const normalized = path.posix.normalize(decoded).replace(/^\/+/, '');
    if (
      !normalized ||
      normalized.startsWith('..') ||
      path.isAbsolute(normalized)
    ) {
      throw new BadRequestException('Invalid file path');
    }

    const resolvedPath = path.resolve(this.uploadDir, normalized);
    const uploadRoot = `${path.resolve(this.uploadDir)}${path.sep}`;
    if (!resolvedPath.startsWith(uploadRoot)) {
      throw new BadRequestException('Invalid file path');
    }

    return resolvedPath;
  }

  private sanitizeFolder(folder: string): string {
    const normalized = folder.trim().replace(/^\/+|\/+$/g, '');
    if (!normalized) {
      return 'general';
    }

    if (!/^[a-zA-Z0-9/_-]+$/.test(normalized) || normalized.includes('..')) {
      throw new BadRequestException('Invalid upload folder');
    }

    return normalized;
  }

  async upload(
    file: StorageFile,
    folder: string = 'general',
    _options?: StorageUploadOptions,
  ): Promise<string> {
    const safeFolder = this.sanitizeFolder(folder);
    const destDir = path.join(this.uploadDir, safeFolder);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${nanoid()}${ext}`;
    const filePath = path.join(destDir, filename);

    try {
      if (file.mimetype.startsWith('image/')) {
        const buffer = file.buffer || fs.readFileSync(file.path!);
        await sharp(buffer)
          .rotate()
          .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
          .toFile(filePath);
      } else {
        if (file.path) {
          fs.renameSync(file.path, filePath);
        } else if (file.buffer) {
          fs.writeFileSync(filePath, file.buffer);
        }
      }

      return `/uploads/${safeFolder}/${filename}`;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to upload file: ${errorMsg}`);
      throw new BadRequestException('Invalid file format or upload failed');
    }
  }

  async delete(url: string): Promise<void> {
    const relativePath = url.replace(/^\/uploads\//, '');
    const filePath = this.resolveSafeUploadPath(relativePath);

    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  }

  async uploadBuffer(
    _buffer: Buffer,
    _objectKey: string,
    _contentType: string,
    _options?: StorageUploadOptions,
  ): Promise<string> {
    throw new Error(
      'uploadBuffer is not supported by local storage. Set STORAGE_PROVIDER=r2 to enable PDF storage.',
    );
  }

  async generateSignedUrl(
    _objectKey: string,
    _expiresInSeconds: number,
  ): Promise<string> {
    throw new Error(
      'generateSignedUrl is not supported by local storage. Set STORAGE_PROVIDER=r2 to enable PDF storage.',
    );
  }
}
