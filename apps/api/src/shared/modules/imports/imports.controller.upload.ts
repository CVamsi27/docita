import { BadRequestException } from '@nestjs/common';
import { extname } from 'path';
import { createTempDiskStorage } from '@/shared/common/utils/upload.utils';

const ALLOWED_IMPORT_EXTENSIONS = new Set(['.xlsx', '.csv']);

function hasSupportedImportExtension(fileName: string): boolean {
  return ALLOWED_IMPORT_EXTENSIONS.has(extname(fileName).toLowerCase());
}

/** Multer options for spreadsheet patient imports (.xlsx / .csv). */
export const spreadsheetImportUploadOptions = {
  storage: createTempDiskStorage(),
  fileFilter: (
    _req: Express.Request,
    file: Express.Multer.File,
    cb: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    if (!hasSupportedImportExtension(file.originalname)) {
      cb(new BadRequestException('Only .xlsx and .csv files are allowed!'), false);
      return;
    }
    cb(null, true);
  },
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
  },
};

/** Multer options for OCR medical document images. */
export const ocrImageUploadOptions = {
  storage: createTempDiskStorage(),
  fileFilter: (
    _req: Express.Request,
    file: Express.Multer.File,
    cb: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    if (!file.mimetype.match(/image\/(jpeg|jpg|png|gif|webp)/)) {
      cb(new BadRequestException('Only image files are allowed!'), false);
      return;
    }
    cb(null, true);
  },
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
};
