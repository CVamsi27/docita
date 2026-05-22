import { Injectable, Logger } from '@nestjs/common';
import type { IClock } from '@/shared/common/ports/clock.port';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import {
  StorageProvider,
  StorageFile,
  StorageUploadOptions,
  StorageMetadataValue,
} from '../application/ports/storage-provider.port';
import * as fs from 'fs';
import * as path from 'path';
import { nanoid } from 'nanoid';

@Injectable()
export class R2StorageProvider extends StorageProvider {
  readonly supportsSignedUrls = true;

  private readonly logger = new Logger(R2StorageProvider.name);
  private readonly client: S3Client;
  private readonly bucket: string;

  private normalizeMetadataValue(value: StorageMetadataValue): string | null {
    if (value === null || value === undefined) {
      return null;
    }

    const resolved =
      value instanceof Date ? value.toISOString() : String(value).trim();
    if (!resolved) {
      return null;
    }

    return resolved.slice(0, 512);
  }

  private normalizeMetadataKey(key: string): string {
    const normalized = key.toLowerCase().replace(/[^a-z0-9-_]/g, '-');
    return normalized.slice(0, 128);
  }

  private toObjectMetadata(
    options?: StorageUploadOptions,
  ): Record<string, string> {
    const uploadedAt = this.clock.now().toISOString();
    const metadata: Record<string, string> = {
      uploaded_at: uploadedAt,
    };

    const source = options?.metadata ?? {};
    for (const [key, value] of Object.entries(source)) {
      const normalizedKey = this.normalizeMetadataKey(key);
      if (!normalizedKey) {
        continue;
      }

      const normalizedValue = this.normalizeMetadataValue(value);
      if (normalizedValue === null) {
        continue;
      }

      metadata[normalizedKey] = normalizedValue;
    }

    if (!metadata.modified_at) {
      metadata.modified_at = uploadedAt;
    }
    if (!metadata.modified_by) {
      metadata.modified_by = 'system';
    }

    return metadata;
  }

  constructor(
    r2Config: {
      accountId: string;
      accessKeyId: string;
      secretAccessKey: string;
      bucketName: string;
    },
    private readonly clock: IClock,
  ) {
    super();

    const accountId = r2Config.accountId;
    const accessKeyId = r2Config.accessKeyId;
    const secretAccessKey = r2Config.secretAccessKey;
    this.bucket = r2Config.bucketName || 'docita-storage';

    if (!accountId || !accessKeyId || !secretAccessKey) {
      throw new Error(
        'Missing R2 configuration. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY.',
      );
    }

    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  async upload(
    file: StorageFile,
    folder: string = 'general',
    options?: StorageUploadOptions,
  ): Promise<string> {
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${nanoid()}${ext}`;
    const objectKey = `${folder}/${filename}`;

    const body =
      file.buffer ??
      (file.path ? fs.createReadStream(file.path) : Buffer.alloc(0));

    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: objectKey,
          Body: body,
          ContentType: file.mimetype,
          Metadata: this.toObjectMetadata(options),
        }),
      );

      return objectKey;
    } finally {
      if (file.path && fs.existsSync(file.path)) {
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

  async delete(objectKey: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: objectKey }),
    );
  }

  async uploadBuffer(
    buffer: Buffer,
    objectKey: string,
    contentType: string,
    options?: StorageUploadOptions,
  ): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
        Body: buffer,
        ContentType: contentType,
        Metadata: this.toObjectMetadata(options),
      }),
    );

    this.logger.log(`Uploaded ${objectKey} to R2 bucket ${this.bucket}`);
    return objectKey;
  }

  async generateSignedUrl(
    objectKey: string,
    expiresInSeconds: number,
  ): Promise<string> {
    const ttl = this.assertSignedUrlTtl(expiresInSeconds);
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: objectKey,
    });

    return getSignedUrl(this.client, command, { expiresIn: ttl });
  }
}
