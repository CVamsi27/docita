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
  abstract upload(file: StorageFile, folder?: string): Promise<string>;

  abstract delete(url: string): Promise<void>;

  protected sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9.\-_]/g, '_')
      .replace(/\.\./g, '')
      .toLowerCase();
  }
}
