import type { UploadSessionPurpose } from '@workspace/db';

export interface CreateUploadSessionOptions {
  expiresInMinutes?: number;
  purpose?: UploadSessionPurpose;
  doctorId?: string | null;
}
