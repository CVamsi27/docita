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
} from '@nestjs/common';
import { OnboardingService } from '@/domains/clinics/application/services/onboarding/onboarding.service';
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
import { RequestWithUser } from '@/common/types/common.types';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { MAX_FILE_SIZE } from '@workspace/utils';

@Public()
@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Post('initialize')
  @HttpCode(201)
  @ZodSerializerDto(OnboardingInitResponseDto)
  initializeOnboarding() {
    return this.onboardingService.initializeOnboarding();
  }

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

  @Get(':onboardingId/progress')
  @ZodSerializerDto(OnboardingProgressDto)
  getProgress(@Param('onboardingId') onboardingId: string) {
    return this.onboardingService.getOnboardingProgress(onboardingId);
  }

  @Post(':onboardingId/complete')
  @HttpCode(201)
  @ZodSerializerDto(OnboardingCompletionResponseDto)
  async completeOnboarding(
    @Param('onboardingId') onboardingId: string,
    @Body(new ZodValidationPipe(completeOnboardingSchema))
    completeData: CompleteOnboardingDto,
    @Request() req: RequestWithUser,
  ) {
    const ipAddress = req.ip || req.socket?.remoteAddress;
    return this.onboardingService.completeOnboarding(
      onboardingId,
      completeData,
      ipAddress,
    );
  }

  @Post(':onboardingId/checkout')
  @HttpCode(201)
  @ZodSerializerDto(OnboardingCheckoutResponseDto)
  async createCheckout(
    @Param('onboardingId') onboardingId: string,
    @Body(new ZodValidationPipe(onboardingCheckoutSchema))
    checkoutData: OnboardingCheckoutDto,
  ) {
    return this.onboardingService.createCheckout(onboardingId, checkoutData);
  }

  @Post(':onboardingId/sla-signature-session')
  async createSlaSignatureSession(@Param('onboardingId') onboardingId: string) {
    return this.onboardingService.createSlaSignatureSession(onboardingId);
  }

  @Post(':onboardingId/sla-signature-session/:sessionId')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
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
  ) {
    if (!file) {
      throw new BadRequestException('Signature file is required');
    }

    return this.onboardingService.uploadSlaSignature(
      onboardingId,
      sessionId,
      file,
    );
  }
}
