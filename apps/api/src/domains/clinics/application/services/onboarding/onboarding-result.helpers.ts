import type { AuthService } from '@/shared/modules/auth/auth/auth.service';
import { Logger } from '@nestjs/common';
import type { OnboardingComplianceService } from './onboarding-compliance.service';
import type { OnboardingValidationService } from './onboarding-validation.service';
import type { CompleteOnboardingDto } from '@/domains/clinics/application/dto/onboarding/create-clinic-onboarding.dto';
import type { OnboardingResult } from './onboarding-result.types';

interface CompletedOnboardingRecords {
  clinic: { id: string };
  adminUser: {
    id: string;
    email: string;
    name: string;
    role: string;
    createdAt: Date;
    updatedAt: Date;
  };
  subscriptionId: string;
}

const logger = new Logger('onboarding-result');

export function buildValidationFailureResult(
  validationService: OnboardingValidationService,
  completeData: CompleteOnboardingDto,
): OnboardingResult {
  const validation =
    validationService.validateOnboardingCompletion(completeData);
  if (validation.valid) {
    throw new Error('Cannot build validation failure for valid data');
  }
  return {
    success: false,
    clinicId: '',
    userId: '',
    message: 'Onboarding validation failed',
    errors: validation.errors,
  };
}

export async function logOnboardingSuccess(
  complianceService: OnboardingComplianceService,
  result: CompletedOnboardingRecords,
  completeData: CompleteOnboardingDto,
  onboardingId: string,
): Promise<void> {
  await complianceService.logOnboardingEvent(
    result.adminUser.id,
    result.clinic.id,
    'CLINIC_ONBOARDED',
    {
      tier: completeData.planSelection.tier,
      billingCycle: completeData.planSelection.billingCycle,
      onboardingId,
    },
  );
}

export async function buildSuccessfulOnboardingResult(
  authService: AuthService,
  result: CompletedOnboardingRecords,
): Promise<OnboardingResult> {
  const authCredentials = await authService.login({
    id: result.adminUser.id,
    email: result.adminUser.email,
    name: result.adminUser.name,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    role: result.adminUser.role as any,
    clinicId: result.clinic.id,
    createdAt: result.adminUser.createdAt,
    updatedAt: result.adminUser.updatedAt,
  });

  return {
    success: true,
    clinicId: result.clinic.id,
    userId: result.adminUser.id,
    subscriptionId: result.subscriptionId,
    message: 'Clinic onboarded successfully. Welcome to Docita!',
    access_token: authCredentials.access_token,
    user: authCredentials.user,
  };
}

interface OnboardingCreationMarkers {
  clinicId?: string;
  userId?: string;
}

export async function handleOnboardingFailure(
  complianceService: OnboardingComplianceService,
  error: unknown,
  onboardingId: string,
  created: OnboardingCreationMarkers,
): Promise<OnboardingResult> {
  const message = error instanceof Error ? error.message : 'Unknown error';

  logger.error(
    `Onboarding failed: ${message}`,
    error instanceof Error ? error.stack : undefined,
  );

  if (created.clinicId && created.userId) {
    await complianceService.logOnboardingEvent(
      created.userId,
      created.clinicId,
      'CLINIC_ONBOARDING_FAILED',
      {
        error: message,
        onboardingId,
      },
    );
  }

  return {
    success: false,
    clinicId: created.clinicId || '',
    userId: created.userId || '',
    message: 'Onboarding failed. Please try again.',
    errors: [message],
  };
}
