import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Request,
  HttpCode,
} from '@nestjs/common';
import { OnboardingService } from '@/domains/clinics/application/services/onboarding/onboarding.service';
import {
  CompleteOnboardingDto,
  OnboardingStep,
  OnboardingProgressDto,
  completeOnboardingSchema,
} from '@/domains/clinics/application/dto/onboarding/create-clinic-onboarding.dto';
import {
  OnboardingInitResponseDto,
  OnboardingCompletionResponseDto,
} from '@/domains/clinics/application/dto/onboarding/onboarding-response.dto';
import { ZodSerializerDto } from 'nestjs-zod';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import { Public } from '@/shared/modules/auth/auth/public.decorator';
import { RequestWithUser } from '@/common/types/common.types';

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
}
