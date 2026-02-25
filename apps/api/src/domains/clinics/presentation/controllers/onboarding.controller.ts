import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Request,
  HttpCode,
  UsePipes,
} from '@nestjs/common';
import { OnboardingService } from '../../application/services/onboarding/onboarding.service';
import {
  CompleteOnboardingDto,
  OnboardingStep,
  OnboardingProgressDto,
  completeOnboardingSchema,
} from '../../application/dto/onboarding/create-clinic-onboarding.dto';
import {
  OnboardingInitResponseDto,
  OnboardingCompletionResponseDto,
} from '../../application/dto/onboarding/onboarding-response.dto';
import { ZodSerializerDto } from 'nestjs-zod';
import { ZodValidationPipe } from '../../../../common/pipes/zod-validation.pipe';
import { Public } from '../../../../shared/modules/auth/auth/public.decorator';
import { RequestWithUser } from '../../../../common/types/common.types';

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

  @Get(':onboardingId/progress')
  @ZodSerializerDto(OnboardingProgressDto)
  getProgress(@Param('onboardingId') onboardingId: string) {
    return this.onboardingService.getOnboardingProgress(onboardingId);
  }

  @Post(':onboardingId/complete')
  @HttpCode(201)
  @ZodSerializerDto(OnboardingCompletionResponseDto)
  @UsePipes(new ZodValidationPipe(completeOnboardingSchema))
  async completeOnboarding(
    @Param('onboardingId') onboardingId: string,
    @Body() completeData: CompleteOnboardingDto,
    @Request() req: RequestWithUser,
  ) {
    const ipAddress = req.ip || (req as any).connection?.remoteAddress;
    return this.onboardingService.completeOnboarding(
      onboardingId,
      completeData,
      ipAddress,
    );
  }
}
