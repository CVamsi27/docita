import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Req,
  UseGuards,
  HttpCode,
  UsePipes,
} from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import {
  CompleteOnboardingDto,
  OnboardingStep,
  OnboardingProgressDto,
  completeOnboardingSchema,
} from './dto/create-clinic-onboarding.dto';
import {
  OnboardingInitResponseDto,
  OnboardingCompletionResponseDto,
} from './dto/onboarding-response.dto';
import { Request } from 'express';
import { ZodSerializerDto } from 'nestjs-zod';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

import { Public } from '../auth/public.decorator';

@Public()
@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  /**
   * Initialize a new onboarding session
   * Returns an onboardingId to track progress
   */
  @Post('initialize')
  @HttpCode(201)
  @ZodSerializerDto(OnboardingInitResponseDto)
  initializeOnboarding() {
    return this.onboardingService.initializeOnboarding();
  }

  /**
   * Update a specific onboarding step
   * Saves progress and returns next step
   */
  @Patch(':onboardingId/step/:step')
  @ZodSerializerDto(OnboardingProgressDto)
  @UsePipes(new ZodValidationPipe(completeOnboardingSchema))
  updateStep(
    @Param('onboardingId') onboardingId: string,
    @Param('step') step: OnboardingStep,
    @Body() data: CompleteOnboardingDto,
  ) {
    return this.onboardingService.updateOnboardingStep(
      onboardingId,
      step,
      data,
    );
  }

  /**
   * Get onboarding progress
   */
  @Get(':onboardingId/progress')
  @ZodSerializerDto(OnboardingProgressDto)
  getProgress(@Param('onboardingId') onboardingId: string) {
    return this.onboardingService.getOnboardingProgress(onboardingId);
  }

  /**
   * Complete onboarding
   * Creates clinic, user, subscription, and all related entities
   */
  @Post(':onboardingId/complete')
  @HttpCode(201)
  @ZodSerializerDto(OnboardingCompletionResponseDto)
  @UsePipes(new ZodValidationPipe(completeOnboardingSchema))
  async completeOnboarding(
    @Param('onboardingId') onboardingId: string,
    @Body() completeData: CompleteOnboardingDto,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    return this.onboardingService.completeOnboarding(
      onboardingId,
      completeData,
      ipAddress,
    );
  }
}
