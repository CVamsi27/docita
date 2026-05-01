import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Request,
  HttpCode,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ForbiddenException,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { OnboardingService } from '@/domains/clinics/application/services/onboarding/onboarding.service';
import { UsersService } from '@/domains/users/application/services/users.service';
import {
  CompleteOnboardingDto,
  OnboardingCheckoutDto,
  OnboardingCheckoutResponseDto,
  OnboardingStep,
  OnboardingProgressDto,
  completeOnboardingSchema,
  onboardingCheckoutSchema,
} from '@/domains/clinics/application/dto/onboarding/create-clinic-onboarding.dto';
import {
  OnboardingInitResponseDto,
  OnboardingCompletionResponseDto,
} from '@/domains/clinics/application/dto/onboarding/onboarding-response.dto';
import { ZodSerializerDto } from 'nestjs-zod';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import { Public } from '@/shared/modules/auth/auth/public.decorator';
import { AllowNoClinic } from '@/shared/modules/auth/auth/allow-no-clinic.decorator';
import { SkipSubscriptionCheck } from '@/shared/modules/auth/decorators/skip-subscription-check.decorator';
import { SkipPasswordExpiry } from '@/shared/modules/auth/guards/password-expired.guard';
import { SkipEmailVerification } from '@/shared/modules/auth/guards/email-verified.guard';
import { RequestWithUser } from '@/common/types/common.types';
import { FileInterceptor } from '@nestjs/platform-express';
import { MAX_FILE_SIZE } from '@workspace/utils';
import {
  assertAllowedFileSignature,
  createTempDiskStorage,
} from '@/common/utils/upload.utils';
import { unlink } from 'fs/promises';

@Controller('onboarding')
export class OnboardingController {
  constructor(
    private readonly onboardingService: OnboardingService,
    private readonly usersService: UsersService,
  ) {}

  @Public()
  @Post('initialize')
  @HttpCode(201)
  @ZodSerializerDto(OnboardingInitResponseDto)
  initializeOnboarding(@Request() req: RequestWithUser) {
    // If an authenticated user already has a clinic or completed onboarding,
    // they must not re-initialize an onboarding session.
    if (
      req.user &&
      (req.user.clinicId || req.user.onboardingStep === 'COMPLETED')
    ) {
      throw new ForbiddenException(
        'Onboarding not allowed for existing clinics',
      );
    }

    return this.onboardingService.initializeOnboarding();
  }

  @Public()
  @Patch(':onboardingId/step/:step')
  @ZodSerializerDto(OnboardingProgressDto)
  updateStep(
    @Param('onboardingId') onboardingId: string,
    @Param('step') step: OnboardingStep,
    @Body(new ZodValidationPipe(completeOnboardingSchema))
    data: CompleteOnboardingDto,
  ) {
    return this.onboardingService.updateOnboardingStep(
      onboardingId,
      step,
      data,
    );
  }

  @Public()
  @Get(':onboardingId/progress')
  @ZodSerializerDto(OnboardingProgressDto)
  getProgress(@Param('onboardingId') onboardingId: string) {
    return this.onboardingService.getOnboardingProgress(onboardingId);
  }

  @Public()
  @Post(':onboardingId/complete')
  @HttpCode(201)
  @ZodSerializerDto(OnboardingCompletionResponseDto)
  async completeOnboarding(
    @Param('onboardingId') onboardingId: string,
    @Body(new ZodValidationPipe(completeOnboardingSchema))
    completeData: CompleteOnboardingDto,
    @Request() req: RequestWithUser,
  ) {
    // Prevent completing onboarding if request user already belongs to a clinic
    if (
      req.user &&
      (req.user.clinicId || req.user.onboardingStep === 'COMPLETED')
    ) {
      throw new ForbiddenException(
        'Onboarding cannot be completed for this account',
      );
    }

    const ipAddress = req.ip || req.socket?.remoteAddress;
    return this.onboardingService.completeOnboarding(
      onboardingId,
      completeData,
      ipAddress,
    );
  }

  @Public()
  @Post(':onboardingId/checkout')
  @HttpCode(201)
  @ZodSerializerDto(OnboardingCheckoutResponseDto)
  async createCheckout(
    @Param('onboardingId') onboardingId: string,
    @Body(new ZodValidationPipe(onboardingCheckoutSchema))
    checkoutData: OnboardingCheckoutDto,
    @Request() req?: RequestWithUser,
  ) {
    if (
      req?.user &&
      (req.user.clinicId || req.user.onboardingStep === 'COMPLETED')
    ) {
      throw new ForbiddenException(
        'Onboarding checkout not allowed for existing clinics',
      );
    }
    return this.onboardingService.createCheckout(onboardingId, checkoutData);
  }

  @Public()
  @Post(':onboardingId/sla-signature-session')
  async createSlaSignatureSession(
    @Param('onboardingId') onboardingId: string,
    @Request() req?: RequestWithUser,
  ) {
    if (
      req?.user &&
      (req.user.clinicId || req.user.onboardingStep === 'COMPLETED')
    ) {
      throw new ForbiddenException(
        'SLA signature session not allowed for existing clinics',
      );
    }

    return this.onboardingService.createSlaSignatureSession(onboardingId);
  }

  @Public()
  @Get(':onboardingId/sla-signature-session/:sessionId/status')
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
    if (!file) {
      throw new BadRequestException('Signature file is required');
    }

    const rawSecret = Array.isArray(uploadSecretHeader)
      ? uploadSecretHeader[0]
      : uploadSecretHeader;
    const uploadSecret = typeof rawSecret === 'string' ? rawSecret.trim() : '';
    if (!uploadSecret) {
      throw new UnauthorizedException('X-Upload-Secret header is required');
    }

    try {
      await assertAllowedFileSignature(file, ['png', 'jpeg', 'webp']);

      if (
        req?.user &&
        (req.user.clinicId || req.user.onboardingStep === 'COMPLETED')
      ) {
        throw new ForbiddenException(
          'Signature upload not allowed for existing clinics',
        );
      }

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

  @Post('choose-path')
  @HttpCode(200)
  @AllowNoClinic()
  @SkipSubscriptionCheck()
  @SkipPasswordExpiry()
  @SkipEmailVerification()
  async choosePath(
    @Request() req: RequestWithUser,
    @Body() dto: { path: string },
  ) {
    if (
      req.user &&
      (req.user.clinicId || req.user.onboardingStep === 'COMPLETED')
    ) {
      throw new ForbiddenException(
        'Choose path not allowed for existing clinics',
      );
    }
    const onboardingStep =
      dto.path === 'CREATE_CLINIC' ? 'CREATING_CLINIC' : 'JOINING_CLINIC';

    await this.usersService.update(req.user!.id, {
      onboardingStep,
    });

    return {
      success: true,
      nextStep: dto.path === 'CREATE_CLINIC' ? 'onboarding' : 'clinic-search',
    };
  }
}
