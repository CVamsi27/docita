import { BadRequestException } from '@nestjs/common';
import { createTempDiskStorage } from '@/shared/common/utils/upload.utils';

const REGISTRATION_CERTIFICATE_MIMES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
];

/** Multer options for doctor registration certificate uploads. */
export const registrationCertificateUploadOptions = {
  storage: createTempDiskStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (
    _req: Express.Request,
    file: Express.Multer.File,
    cb: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    if (!REGISTRATION_CERTIFICATE_MIMES.includes(file.mimetype)) {
      cb(
        new BadRequestException('Only PDF, JPEG, and PNG files are allowed'),
        false,
      );
      return;
    }
    cb(null, true);
  },
};
