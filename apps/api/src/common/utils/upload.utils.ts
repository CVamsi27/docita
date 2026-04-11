import { BadRequestException } from '@nestjs/common';
import type { StorageFile } from '@/domains/documents/infrastructure/storage.provider';
import { extname, join } from 'path';
import { mkdirSync } from 'fs';
import { open } from 'fs/promises';
import { diskStorage } from 'multer';

const TEMP_UPLOAD_DIR = join(process.cwd(), 'uploads', 'temp');

export function createTempDiskStorage() {
  mkdirSync(TEMP_UPLOAD_DIR, { recursive: true });

  return diskStorage({
    destination: TEMP_UPLOAD_DIR,
    filename: (_req, file, cb) => {
      const randomName = Array(32)
        .fill(null)
        .map(() => Math.round(Math.random() * 16).toString(16))
        .join('');

      cb(null, `${randomName}${extname(file.originalname)}`);
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

export async function assertAllowedFileSignature(
  file: Pick<StorageFile, 'buffer' | 'path'>,
  allowedTypes: Array<'pdf' | 'png' | 'jpeg' | 'webp'>,
): Promise<void> {
  const signature = await readFileSignature(file);
  const header = signature.toString('hex', 0, 4).toUpperCase();
  const webpHeader = signature.toString('hex', 8, 12).toUpperCase();

  const allowed = new Set(allowedTypes);
  const isPdf = header === '25504446';
  const isPng = header === '89504E47';
  const isJpeg = header.startsWith('FFD8FF');
  const isWebp = header === '52494646' && webpHeader === '57454250';

  if (
    (allowed.has('pdf') && isPdf) ||
    (allowed.has('png') && isPng) ||
    (allowed.has('jpeg') && isJpeg) ||
    (allowed.has('webp') && isWebp)
  ) {
    return;
  }

  throw new BadRequestException(
    'Invalid file content. The file type does not match its extension/MIME type.',
  );
}
