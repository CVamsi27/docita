import { Injectable, Logger } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { StorageProvider, StorageFile } from './storage.provider';
import * as fs from 'fs';
import * as path from 'path';
import { nanoid } from 'nanoid';

@Injectable()
export class R2StorageProvider extends StorageProvider {
  readonly supportsSignedUrls = true;

  private readonly logger = new Logger(R2StorageProvider.name);
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor() {
    super();

    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    this.bucket = process.env.R2_BUCKET_NAME ?? 'docita';

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

  async upload(file: StorageFile, folder: string = 'general'): Promise<string> {
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${nanoid()}${ext}`;
    const objectKey = `${folder}/${filename}`;

    const buffer =
      file.buffer ?? (file.path ? fs.readFileSync(file.path) : Buffer.alloc(0));

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
        Body: buffer,
        ContentType: file.mimetype,
      }),
    );

    return objectKey;
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
  ): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
        Body: buffer,
        ContentType: contentType,
      }),
    );

    this.logger.log(`Uploaded ${objectKey} to R2 bucket ${this.bucket}`);
    return objectKey;
  }

  async generateSignedUrl(
    objectKey: string,
    expiresInSeconds: number,
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: objectKey,
    });

    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }
}
