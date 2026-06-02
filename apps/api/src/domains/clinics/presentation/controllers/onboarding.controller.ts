import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Request,
  HttpCode,
  ForbiddenException,
} from '@nestjs/common';
import { OnboardingService } from '@/domains/clinics/application/services/onboarding/onboarding.service';
import { UsersService } from '@/domains/users/application/services/users.service';
import {
  CompleteOnboardingDto,
  OnboardingCheckoutDto,
  OnboardingCheckoutResponseDto,
  OnboardingTrialEligibilityResponseDto,
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
import { ZodValidationPipe } from '@/shared/common/pipes/zod-validation.pipe';
import { Public } from '@/shared/modules/auth/auth/public.decorator';
import { AllowNoClinic } from '@/shared/modules/auth/auth/allow-no-clinic.decorator';
import { SkipSubscriptionCheck } from '@/shared/modules/auth/decorators/skip-subscription-check.decorator';
import { SkipPasswordExpiry } from '@/shared/modules/auth/guards/password-expired.guard';
import { SkipEmailVerification } from '@/shared/modules/auth/guards/email-verified.guard';
import { RequestWithUser } from '@/shared/common/types/common.types';
import { requireAuthenticatedUserId } from '@/shared/modules/auth/auth/clinic-request-context';
import { assertNoExistingClinicOnboarding } from '@/domains/clinics/presentation/controllers/onboarding-controller.helpers';

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
    assertNoExistingClinicOnboarding(req, 'Onboarding');
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
    assertNoExistingClinicOnboarding(req, 'Onboarding checkout');
    return this.onboardingService.createCheckout(onboardingId, checkoutData);
  }

  @Post(':onboardingId/trial-eligibility')
  @HttpCode(200)
  @AllowNoClinic()
  @SkipSubscriptionCheck()
  @SkipPasswordExpiry()
  @SkipEmailVerification()
  @ZodSerializerDto(OnboardingTrialEligibilityResponseDto)
  getTrialEligibility(
    @Param('onboardingId') onboardingId: string,
    @Request() req: RequestWithUser,
  ) {
    if (!req.user?.email) {
      throw new ForbiddenException(
        'Trial eligibility requires an authenticated account',
      );
    }
    return this.onboardingService.getTrialEligibility(
      onboardingId,
      req.user.email,
    );
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
    assertNoExistingClinicOnboarding(req, 'Choose path');

    const onboardingStep =
      dto.path === 'CREATE_CLINIC' ? 'CREATING_CLINIC' : 'JOINING_CLINIC';

    await this.usersService.update(requireAuthenticatedUserId(req), {
      onboardingStep,
    });

    return {
      success: true,
      nextStep: dto.path === 'CREATE_CLINIC' ? 'onboarding' : 'clinic-search',
    };
  }
}
