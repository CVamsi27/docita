import {
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, timingSafeEqual } from 'crypto';
import type { IClock } from '@/shared/common/ports/clock.port';

export function hashUploadSecret(plaintext: string): string {
  return createHash('sha256').update(plaintext, 'utf8').digest('hex');
}

export function assertUploadSecretValid(
  uploadSecretHash: string | null,
  uploadSecret: string | undefined,
): void {
  if (!uploadSecretHash) {
    throw new BadRequestException(
      'This upload session is no longer valid. Create a new upload session.',
    );
  }

  const trimmed = uploadSecret?.trim();
  if (!trimmed) {
    throw new UnauthorizedException(
      'Upload credentials are required (X-Upload-Secret header).',
    );
  }

  const expected = Buffer.from(uploadSecretHash, 'hex');
  const candidate = Buffer.from(hashUploadSecret(trimmed), 'hex');

  if (
    expected.length !== candidate.length ||
    !timingSafeEqual(expected, candidate)
  ) {
    throw new UnauthorizedException('Invalid upload credentials');
  }
}

export function validateSessionReadyForUpload(
  session: {
    uploadSecretHash: string | null;
    expiresAt: Date;
    status: string;
    fileUrl: string | null;
  },
  uploadSecret: string | undefined,
  clock: IClock,
): void {
  assertUploadSecretValid(session.uploadSecretHash, uploadSecret);

  if (session.expiresAt.getTime() < clock.now().getTime()) {
    throw new BadRequestException('This upload link has expired');
  }

  if (session.status === 'uploaded' || session.fileUrl) {
    throw new BadRequestException('This upload link has already been used');
  }
}
