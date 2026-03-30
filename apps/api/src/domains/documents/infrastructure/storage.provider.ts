import { Injectable as _Injectable } from '@nestjs/common';

export interface StorageFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer?: Buffer;
  path?: string;
}

export abstract class StorageProvider {
  abstract readonly supportsSignedUrls: boolean;

  abstract upload(file: StorageFile, folder?: string): Promise<string>;

  abstract delete(url: string): Promise<void>;

  /**
   * Upload a raw buffer directly (used for generated PDFs).
   * Returns the objectKey that should be persisted in the database.
   */
  abstract uploadBuffer(
    buffer: Buffer,
    objectKey: string,
    contentType: string,
  ): Promise<string>;

  /**
   * Generate a time-limited signed URL for the given objectKey.
   * Only supported when supportsSignedUrls is true.
   */
  abstract generateSignedUrl(
    objectKey: string,
    expiresInSeconds: number,
  ): Promise<string>;

  protected sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9.\-_]/g, '_')
      .replace(/\.\./g, '')
      .toLowerCase();
  }
}
