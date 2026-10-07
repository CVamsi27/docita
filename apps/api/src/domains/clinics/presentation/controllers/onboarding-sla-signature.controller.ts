import {
  Controller,
  Post,
  Get,
  Param,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UnauthorizedException,
  Headers,
} from '@nestjs/common';
import { OnboardingService } from '@/domains/clinics/application/services/onboarding/onboarding.service';
import { Public } from '@/shared/modules/auth/auth/public.decorator';
import { RequestWithUser } from '@/shared/common/types/common.types';
import { FileInterceptor } from '@nestjs/platform-express';
import { MAX_FILE_SIZE } from '@workspace/utils';
import { ZodSerializerDto } from 'nestjs-zod';
import {
  UploadSessionCreateResponseDto,
  UploadSessionResponseDto,
} from '@/domains/documents/application/dto/uploads.dto';
import { SlaSignatureSessionStatusDto } from '@/domains/clinics/application/dto/sla-signature-session.dto';
import {
  assertAllowedFileSignature,
  createTempDiskStorage,
} from '@/shared/common/utils/upload.utils';
import { unlink } from 'fs/promises';
import { assertNoExistingClinicOnboarding } from '@/domains/clinics/presentation/controllers/onboarding-controller.helpers';

@Controller('onboarding')
export class OnboardingSlaSignatureController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Public()
  @Post(':onboardingId/sla-signature-session')
  // Without this serializer the public route returned the whole UploadSession
  // row that `UploadsService.createSession` builds, including `uploadSecretHash`.
  // The authenticated `/uploads/session` route already trims it; this one did
  // not, and it needs no session to reach.
  @ZodSerializerDto(UploadSessionCreateResponseDto)
  async createSlaSignatureSession(
    @Param('onboardingId') onboardingId: string,
    @Request() req?: RequestWithUser,
  ) {
    assertNoExistingClinicOnboarding(req, 'SLA signature session');
    return this.onboardingService.createSlaSignatureSession(onboardingId);
  }

  @Public()
  @Get(':onboardingId/sla-signature-session/:sessionId/status')
  @ZodSerializerDto(SlaSignatureSessionStatusDto)
  getSlaSignatureSessionStatus(
    @Param('onboardingId') onboardingId: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.onboardingService.getSlaSignatureSessionStatus(
      onboardingId,
      sessionId,
    );
  }

  @Public()
  @Post(':onboardingId/sla-signature-session/:sessionId')
  @ZodSerializerDto(UploadSessionResponseDto)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: createTempDiskStorage(),
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (_req, file, cb) => {
        const allowedMimes = [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/webp',
        ];

        if (!allowedMimes.includes(file.mimetype)) {
          return cb(
            new BadRequestException(
              'Only signature images (JPEG, PNG, WebP) are allowed',
            ),
            false,
          );
        }

        cb(null, true);
      },
    }),
  )
  async uploadSlaSignature(
    @Param('onboardingId') onboardingId: string,
    @Param('sessionId') sessionId: string,
    @UploadedFile() file: Express.Multer.File,
    @Headers('x-upload-secret')
    uploadSecretHeader: string | string[] | undefined,
    @Request() req?: RequestWithUser,
  ) {
    if (!file) throw new BadRequestException('Signature file is required');

    const rawSecret = Array.isArray(uploadSecretHeader)
      ? uploadSecretHeader[0]
      : uploadSecretHeader;
    const uploadSecret = typeof rawSecret === 'string' ? rawSecret.trim() : '';
    if (!uploadSecret)
      throw new UnauthorizedException('X-Upload-Secret header is required');

    try {
      await assertAllowedFileSignature(file, ['png', 'jpeg', 'webp'], {
        originalname: file.originalname,
        mimetype: file.mimetype,
      });
      assertNoExistingClinicOnboarding(req, 'Signature upload');

      return await this.onboardingService.uploadSlaSignature(
        onboardingId,
        sessionId,
        file,
        uploadSecret,
        {
          modifiedBy: req?.user?.id,
          modifiedByRole: req?.user?.role,
          ipAddress: req?.ip || req?.socket?.remoteAddress,
          userAgent: req?.headers?.['user-agent'],
        },
      );
    } catch (error) {
      if (file.path) {
        await unlink(file.path).catch(() => {});
      }
      throw error;
    }
  }
}
