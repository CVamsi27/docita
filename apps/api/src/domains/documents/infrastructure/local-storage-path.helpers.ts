import * as path from 'path';
import { BadRequestException } from '@nestjs/common';

export function normalizeStorageKey(rawPath: string): string {
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

export function sanitizeStorageFolder(folder: string): string {
  const normalized = folder.trim().replace(/^\/+|\/+$/g, '');
  if (!normalized) return 'general';
  if (!/^[a-zA-Z0-9/_-]+$/.test(normalized) || normalized.includes('..')) {
    throw new BadRequestException('Invalid upload folder');
  }
  return normalized;
}

export function resolveSafeUploadPath(
  rawPath: string,
  uploadDir: string,
): string {
  const normalized = normalizeStorageKey(rawPath);
  const resolvedPath = path.resolve(uploadDir, normalized);
  const uploadRoot = `${path.resolve(uploadDir)}${path.sep}`;
  if (!resolvedPath.startsWith(uploadRoot)) {
    throw new BadRequestException('Invalid file path');
  }
  return resolvedPath;
}

export function getPublicUploadUrl(
  objectKey: string,
  apiOrigin: string,
): string {
  const normalized = normalizeStorageKey(objectKey);
  return `${apiOrigin}/uploads/${normalized}`;
}
