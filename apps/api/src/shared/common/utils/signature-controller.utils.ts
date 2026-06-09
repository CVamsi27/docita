import { BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { unlink } from 'fs/promises';
import {
  createTempDiskStorage,
  assertAllowedFileSignature,
} from './upload.utils';

const ALLOWED_MIMES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export function createSignatureFileInterceptor() {
  return FileInterceptor('file', {
    storage: createTempDiskStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (
      _req: unknown,
      file: Express.Multer.File,
      cb: (error: Error | null, accept: boolean) => void,
    ) => {
      if (!ALLOWED_MIMES.includes(file.mimetype)) {
        return cb(
          new BadRequestException('Only images (JPEG, PNG, WebP) are allowed'),
          false,
        );
      }
      cb(null, true);
    },
  });
}

interface SignatureUploadServiceLike {
  uploadSignature(token: string, file: Express.Multer.File): Promise<unknown>;
}

export async function handleSignatureUpload(
  service: SignatureUploadServiceLike,
  token: string,
  file: Express.Multer.File,
) {
  if (!file) throw new BadRequestException('File is required');

  try {
    await assertAllowedFileSignature(file, ['png', 'jpeg', 'webp'], {
      originalname: file.originalname,
      mimetype: file.mimetype,
    });
    return await service.uploadSignature(token, file);
  } catch (error) {
    if (file.path) {
      await unlink(file.path).catch(() => {});
    }
    throw error;
  }
}
