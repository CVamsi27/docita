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

export interface LocalStorageProviderOptions {
  apiUrl?: string;
  rootDir?: string;
}

@Injectable()
export class LocalStorageProvider extends StorageProvider {
  readonly supportsSignedUrls = false;

  private readonly logger = new Logger(LocalStorageProvider.name);
  private readonly uploadDir: string;
  private readonly apiOrigin: string;

  constructor(options: LocalStorageProviderOptions = {}) {
    super();
    this.uploadDir = options.rootDir ?? path.join(process.cwd(), 'uploads');
    this.apiOrigin = new URL(
      options.apiUrl ?? 'http://localhost:3001',
      'http://localhost:3001',
    ).origin;

    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  private normalizeStorageKey(rawPath: string): string {
    const decoded = decodeURIComponent(rawPath).trim();
    const normalized = path.posix.normalize(decoded).replace(/^\/+/, '');
    if (
      !normalized ||
      normalized.startsWith('..') ||
      path.isAbsolute(normalized)
    ) {
      throw new BadRequestException('Invalid file path');
    }

    return normalized;
  }

  private resolveSafeUploadPath(rawPath: string): string {
    const normalized = this.normalizeStorageKey(rawPath);
    const resolvedPath = path.resolve(this.uploadDir, normalized);
    const uploadRoot = `${path.resolve(this.uploadDir)}${path.sep}`;
    if (!resolvedPath.startsWith(uploadRoot)) {
      throw new BadRequestException('Invalid file path');
    }

    return resolvedPath;
  }

  private getPublicUploadUrl(objectKey: string): string {
    const normalized = this.normalizeStorageKey(objectKey);
    return `${this.apiOrigin}/uploads/${normalized}`;
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

  private async writeImageToFile(
    source: Buffer | string,
    filePath: string,
  ): Promise<void> {
    await sharp(source)
      .rotate()
      .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
      .toFile(filePath);
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
        const source = file.path ?? file.buffer;
        if (!source) {
          throw new BadRequestException('Uploaded file could not be read');
        }

        await this.writeImageToFile(source, filePath);
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
    } finally {
      if (file.path && file.path !== filePath && fs.existsSync(file.path)) {
        try {
          fs.unlinkSync(file.path);
        } catch (error) {
          this.logger.warn(
            `Failed to delete temp upload ${file.path}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    }
  }

  async delete(url: string): Promise<void> {
    const parsedUrl = (() => {
      try {
        return new URL(url);
      } catch {
        return null;
      }
    })();

    const relativePath =
      parsedUrl?.pathname.replace(/^\/uploads\//, '') ??
      url
        .replace(/^https?:\/\/[^/]+\/uploads\//i, '')
        .replace(/^\/uploads\//, '')
        .replace(/^uploads\//, '');
    const filePath = this.resolveSafeUploadPath(relativePath);

    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  }

  async uploadBuffer(
    buffer: Buffer,
    objectKey: string,
    _contentType: string,
    _options?: StorageUploadOptions,
  ): Promise<string> {
    const safeObjectKey = this.normalizeStorageKey(objectKey);
    const filePath = this.resolveSafeUploadPath(safeObjectKey);
    const fileDir = path.dirname(filePath);
    if (!fs.existsSync(fileDir)) {
      fs.mkdirSync(fileDir, { recursive: true });
    }

    await fs.promises.writeFile(filePath, buffer);
    return safeObjectKey;
  }

  async generateSignedUrl(
    objectKey: string,
    _expiresInSeconds: number,
  ): Promise<string> {
    return this.getPublicUploadUrl(objectKey);
  }
}
