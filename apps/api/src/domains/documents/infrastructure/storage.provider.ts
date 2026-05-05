import {
  Injectable as _Injectable,
  Logger as _Logger,
  BadRequestException,
} from '@nestjs/common';

/** Hard ceiling on signed URL lifetimes. Tighter than R2/S3 max (7d). */
export const MAX_SIGNED_URL_TTL_SECONDS = 24 * 60 * 60;
/** Floor: anything shorter has no operational use. */
export const MIN_SIGNED_URL_TTL_SECONDS = 30;

export interface StorageFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer?: Buffer;
  path?: string;
}

export type StorageMetadataValue =
  | string
  | number
  | boolean
  | Date
  | null
  | undefined;

export interface StorageUploadOptions {
  metadata?: Record<string, StorageMetadataValue>;
}

export abstract class StorageProvider {
  abstract readonly supportsSignedUrls: boolean;

  abstract upload(
    file: StorageFile,
    folder?: string,
    options?: StorageUploadOptions,
  ): Promise<string>;

  abstract delete(url: string): Promise<void>;

  /**
   * Upload a raw buffer directly (used for generated PDFs).
   * Returns the objectKey that should be persisted in the database.
   */
  abstract uploadBuffer(
    buffer: Buffer,
    objectKey: string,
    contentType: string,
    options?: StorageUploadOptions,
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

  /**
   * Clamps the requested signed URL TTL into the
   * [MIN_SIGNED_URL_TTL_SECONDS, MAX_SIGNED_URL_TTL_SECONDS] band.
   *
   * Throws BadRequestException for non-finite or non-positive inputs to
   * surface caller bugs early; otherwise silently clamps so operational
   * defaults can drift without exception storms in production.
   */
  protected assertSignedUrlTtl(expiresInSeconds: number): number {
    if (!Number.isFinite(expiresInSeconds) || expiresInSeconds <= 0) {
      throw new BadRequestException(
        `Signed URL TTL must be a positive finite number, received ${String(expiresInSeconds)}`,
      );
    }
    if (expiresInSeconds < MIN_SIGNED_URL_TTL_SECONDS) {
      return MIN_SIGNED_URL_TTL_SECONDS;
    }
    if (expiresInSeconds > MAX_SIGNED_URL_TTL_SECONDS) {
      return MAX_SIGNED_URL_TTL_SECONDS;
    }
    return Math.floor(expiresInSeconds);
  }
}
