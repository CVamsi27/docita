import {
  Controller,
  Post,
  Get,
  Param,
  Request,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadsService } from '@/domains/documents/application/services/uploads.service';
import { MAX_FILE_SIZE } from '@workspace/utils';
import { UploadSessionResponseDto } from '@/domains/documents/application/dto/uploads.dto';
import { ZodSerializerDto } from 'nestjs-zod';
import { APP_ACCESS_TARGETS } from '@workspace/types';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { TierGuard } from '@/shared/modules/auth/auth/tier.guard';
import {
  Feature,
  RequireFeature,
} from '@/shared/modules/auth/auth/tier.decorator';
import { getDbRolesForTarget } from '@/shared/modules/auth/auth/access-matrix.util';
import { RequestWithUser } from '@/common/types/common.types';
import {
  assertAllowedFileSignature,
  createTempDiskStorage,
} from '@/common/utils/upload.utils';
import { unlink } from 'fs/promises';

@Controller('uploads')
@UseGuards(TierGuard)
@RequireFeature(Feature.DOCUMENT_ARCHIVAL)
@Roles(...getDbRolesForTarget(APP_ACCESS_TARGETS.API_MEDICAL_DOCUMENTS))
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
      storage: createTempDiskStorage(),
      limits: {
        fileSize: MAX_FILE_SIZE,
      },
      fileFilter: (_req, file, cb) => {
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

        cb(null, true);
      },
    }),
  )
  @ZodSerializerDto(UploadSessionResponseDto)
  async uploadFile(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: RequestWithUser,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    try {
      await assertAllowedFileSignature(file, ['pdf', 'png', 'jpeg', 'webp']);

      return await this.uploadsService.updateSession(id, file, {
        modifiedBy: req.user?.id,
        modifiedByRole: req.user?.role,
        authMethod: req.user ? 'session-auth' : 'anonymous-upload',
        ipAddress: req.ip || req.socket?.remoteAddress,
        userAgent: req.headers?.['user-agent'],
      });
    } catch (error) {
      if (file.path) {
        await unlink(file.path).catch(() => {});
      }
      throw error;
    }
  }
}
