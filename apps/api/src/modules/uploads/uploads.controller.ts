import {
  Controller,
  Post,
  Get,
  Param,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadsService } from './uploads.service';
import { memoryStorage } from 'multer';
import { MAX_FILE_SIZE } from '@workspace/utils';
import { UploadSessionResponseDto } from './dto/uploads.dto';
import { ZodSerializerDto } from 'nestjs-zod';
import { Role } from '@workspace/db';
import { Roles } from '../auth/roles.decorator';

@Controller('uploads')
@Roles(Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST, Role.ADMIN_DOCTOR)
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('session')
  @ZodSerializerDto(UploadSessionResponseDto)
  async createSession() {
    return this.uploadsService.createSession();
  }

  @Get('session/:id')
  @ZodSerializerDto(UploadSessionResponseDto)
  async getSession(@Param('id') id: string) {
    return this.uploadsService.getSession(id);
  }

  @Post('session/:id')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: MAX_FILE_SIZE, // Shared limit (e.g., 5MB)
      },
      fileFilter: (req, file, cb) => {
        // Accept common safe image and document types
        const allowedMimes = [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/webp',
          'application/pdf',
        ];
        if (!allowedMimes.includes(file.mimetype)) {
          return cb(
            new BadRequestException(
              'Only images (JPEG, PNG, WebP) and PDFs are allowed',
            ),
            false,
          );
        }

        // We will perform magic-bytes check in the controller method since
        // Multer fileFilter doesn't have easy access to the buffer if memoryStorage is used
        // (it's actually available in UploadedFile after filter passes).
        // For simplicity and to fail fast, we let it pass filter and check in uploadFile.
        cb(null, true);
      },
    }),
  )
  @ZodSerializerDto(UploadSessionResponseDto)
  async uploadFile(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    // Magic Bytes Validation
    const buffer = file.buffer;
    const header = buffer.toString('hex', 0, 4).toUpperCase();
    const webpHeader = buffer.toString('hex', 8, 12).toUpperCase();

    const signatures = {
      PDF: '25504446', // %PDF
      PNG: '89504E47',
      JPEG: 'FFD8FF',
      RIFF: '52494646', // WebP container
    };

    let isValid = false;
    if (header === signatures.PDF) isValid = true;
    else if (header === signatures.PNG) isValid = true;
    else if (header.startsWith(signatures.JPEG)) isValid = true;
    else if (header === signatures.RIFF && webpHeader === '57454250')
      isValid = true;

    if (!isValid) {
      throw new BadRequestException(
        'Invalid file content. The file type does not match its extension/MIME type.',
      );
    }

    return this.uploadsService.updateSession(id, file);
  }
}
