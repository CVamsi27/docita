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
  UnauthorizedException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadsService } from '@/domains/documents/application/services/uploads.service';
import { MAX_FILE_SIZE } from '@workspace/utils';
import {
  UploadSessionCreateResponseDto,
  UploadSessionResponseDto,
} from '@/domains/documents/application/dto/uploads.dto';
import { ZodSerializerDto } from 'nestjs-zod';
import { APP_ACCESS_TARGETS } from '@workspace/types';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { Public } from '@/shared/modules/auth/auth/public.decorator';
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
  @ZodSerializerDto(UploadSessionCreateResponseDto)
  async createSession() {
    return this.uploadsService.createSession();
  }

  @Get('session/:id')
  @ZodSerializerDto(UploadSessionResponseDto)
  async getSession(@Param('id') id: string) {
    return this.uploadsService.getSession(id);
  }

  /**
   * Skips JWT for QR/mobile uploads; access is gated by `X-Upload-Secret`
   * issued once from POST /uploads/session (not derivable from the session id alone).
   */
  @Post('session/:id')
  @Public()
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

    const rawSecret = req.headers['x-upload-secret'];
    const uploadSecretHeader = Array.isArray(rawSecret)
      ? rawSecret[0]
      : rawSecret;
    const uploadSecret =
      typeof uploadSecretHeader === 'string' ? uploadSecretHeader.trim() : '';
    if (!uploadSecret) {
      throw new UnauthorizedException('X-Upload-Secret header is required');
    }

    try {
      await assertAllowedFileSignature(file, ['pdf', 'png', 'jpeg', 'webp']);

      return await this.uploadsService.updateSession(id, file, {
        modifiedBy: req.user?.id,
        modifiedByRole: req.user?.role,
        authMethod: req.user ? 'session-auth' : 'upload-session-secret',
        ipAddress: req.ip || req.socket?.remoteAddress,
        userAgent: req.headers?.['user-agent'],
        uploadSecret,
      });
    } catch (error) {
      if (file.path) {
        await unlink(file.path).catch(() => {});
      }
      throw error;
    }
  }
}
