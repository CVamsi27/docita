import { BadRequestException } from '@nestjs/common';

/** Hard ceiling on signed URL lifetimes. Tighter than R2/S3 max (7d). */
export const MAX_SIGNED_URL_TTL_SECONDS = 24 * 60 * 60;
/** Floor: anything shorter has no operational use. */
export const MIN_SIGNED_URL_TTL_SECONDS = 30;
/** Generated clinical PDFs contain PHI, so keep their bearer lifetime short. */
export const GENERATED_PDF_SIGNED_URL_TTL_SECONDS = 15 * 60;
/** Generic private uploads are used by longer-lived profile and document views. */
export const GENERIC_STORED_FILE_SIGNED_URL_TTL_SECONDS = 4 * 60 * 60;

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

  /**
   * Fetch the raw object (buffer + content type) from storage.
   * Used by proxy routes that read server-side instead of redirecting
   * to a signed URL.
   */
  abstract getObject(
    objectKey: string,
  ): Promise<{ buffer: Buffer; contentType: string }>;

  protected sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9.\-_]/g, '_')
      .replace(/\.\./g, '')
      .toLowerCase();
  }

  /**
   * Clamps the requested signed URL TTL into the
   * [MIN_SIGNED_URL_TTL_SECONDS, MAX_SIGNED_URL_TTL_SECONDS] band.
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
