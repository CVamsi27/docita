import { Injectable } from '@nestjs/common';

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
  /**
   * Upload a file and return the public URL
   */
  abstract upload(file: StorageFile, folder?: string): Promise<string>;

  /**
   * Delete a file by URL
   */
  abstract delete(url: string): Promise<void>;

  /**
   * Sanitize filename to prevent path traversal and XSS
   */
  protected sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9.\-_]/g, '_')
      .replace(/\.\./g, '')
      .toLowerCase();
  }
}
