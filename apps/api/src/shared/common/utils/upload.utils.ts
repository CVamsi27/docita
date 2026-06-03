import { BadRequestException } from '@nestjs/common';
import type { StorageFile } from '@/domains/documents/application/ports/storage-provider.port';
import { extname, join } from 'path';
import { mkdirSync } from 'fs';
import { open } from 'fs/promises';
import { randomBytes } from 'crypto';
import { diskStorage } from 'multer';

const MIME_TO_EXT: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/gif': ['.gif'],
  'application/pdf': ['.pdf'],
};

const TEMP_UPLOAD_DIR = join(process.cwd(), 'uploads', 'temp');

export function createTempDiskStorage() {
  mkdirSync(TEMP_UPLOAD_DIR, { recursive: true });

  return diskStorage({
    destination: TEMP_UPLOAD_DIR,
    filename: (_req, file, cb) => {
      cb(
        null,
        `${randomBytes(16).toString('hex')}${extname(file.originalname)}`,
      );
    },
  });
}

async function readFileSignature(
  file: Pick<StorageFile, 'buffer' | 'path'>,
): Promise<Buffer> {
  if (file.buffer) {
    return file.buffer.subarray(0, 12);
  }

  if (!file.path) {
    throw new BadRequestException('Uploaded file could not be read');
  }

  const handle = await open(file.path, 'r');
  try {
    const signature = Buffer.alloc(12);
    const { bytesRead } = await handle.read(signature, 0, signature.length, 0);
    return signature.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
}

/**
 * Validates a file's content signatures (magic bytes) and optionally its
 * extension against the declared MIME type.
 *
 * @param file - The uploaded file (buffer or path)
 * @param allowedTypes - Allowed content types (pdf, png, jpeg, webp, gif)
 * @param originalname - Optional original filename to validate extension
 * @param mimetype - Optional MIME type to validate extension
 * @throws BadRequestException if content or extension validation fails
 */
export async function assertAllowedFileSignature(
  file: Pick<StorageFile, 'buffer' | 'path'>,
  allowedTypes: Array<'pdf' | 'png' | 'jpeg' | 'webp' | 'gif'>,
  options?: { originalname?: string; mimetype?: string },
): Promise<void> {
  const signature = await readFileSignature(file);
  const header = signature.toString('hex', 0, 4).toUpperCase();
  const shortHeader = signature.toString('hex', 0, 3).toUpperCase();
  const webpHeader = signature.toString('hex', 8, 12).toUpperCase();

  const allowed = new Set(allowedTypes);
  const isPdf = header === '25504446';
  const isPng = header === '89504E47';
  const isJpeg = header.startsWith('FFD8FF');
  const isWebp = header === '52494646' && webpHeader === '57454250';
  const isGif = shortHeader === '474946';

  const detectedType =
    (isPdf && 'pdf') ||
    (isPng && 'png') ||
    (isJpeg && 'jpeg') ||
    (isWebp && 'webp') ||
    (isGif && 'gif') ||
    null;

  if (!detectedType || !allowed.has(detectedType)) {
    throw new BadRequestException(
      'Invalid file content. The file type does not match its extension/MIME type.',
    );
  }

  if (options?.originalname) {
    const extension = extname(options.originalname).toLowerCase();
    const mimeKey = options.mimetype ?? '';
    const allowedExtensions = MIME_TO_EXT[mimeKey];

    if (allowedExtensions && !allowedExtensions.includes(extension)) {
      throw new BadRequestException(
        `File extension "${extension}" does not match declared MIME type "${mimeKey}". ` +
          `Allowed: ${allowedExtensions.join(', ')}.`,
      );
    }
  }
}

export async function assertAllowedImportFileSignature(
  file: Pick<StorageFile, 'buffer' | 'path'> & { originalname?: string },
): Promise<void> {
  const extension = extname(file.originalname ?? '').toLowerCase();
  const signature = await readFileSignature(file);
  const header = signature.toString('hex', 0, 4).toUpperCase();

  if (extension === '.xlsx') {
    const isZipContainer =
      header === '504B0304' || header === '504B0506' || header === '504B0708';
    if (isZipContainer) return;
  }

  if (extension === '.csv') {
    const hasNullByte = signature.includes(0);
    if (!hasNullByte) return;
  }

  throw new BadRequestException(
    'Invalid import file content. The file content does not match its extension.',
  );
}
