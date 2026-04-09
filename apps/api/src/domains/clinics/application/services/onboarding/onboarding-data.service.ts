import {
  Injectable,
  Logger,
  BadRequestException,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  OnboardingStep,
  OnboardingProgressDto,
} from '@/domains/clinics/application/dto/onboarding/create-clinic-onboarding.dto';
import type { CompleteOnboardingDto } from '@/domains/clinics/application/dto/onboarding/create-clinic-onboarding.dto';

interface OnboardingSession {
  id: string;
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  data: Partial<CompleteOnboardingDto>;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}

@Injectable()
export class OnboardingDataService implements OnModuleDestroy {
  private readonly logger = new Logger(OnboardingDataService.name);
  private onboardingSessions = new Map<string, OnboardingSession>();
  private cleanupTimer: NodeJS.Timeout;

  constructor() {
    this.cleanupTimer = setInterval(() => this.cleanExpiredSessions(), 3600000);
    this.cleanupTimer.unref?.();
  }

  initializeOnboarding(): { onboardingId: string } {
    const onboardingId = this.generateOnboardingId();
    const session: OnboardingSession = {
      id: onboardingId,
      currentStep: OnboardingStep.CLINIC_DETAILS,
      completedSteps: [],
      data: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };

    this.onboardingSessions.set(onboardingId, session);
    this.logger.log(`Initialized onboarding session: ${onboardingId}`);

    return { onboardingId };
  }

  updateOnboardingData(
    onboardingId: string,
    step: OnboardingStep,
    data: Record<string, unknown>,
  ): { success: boolean; message: string } {
    const session = this.onboardingSessions.get(onboardingId);

    if (!session) {
      throw new BadRequestException('Onboarding session not found or expired');
    }

    const key = this.getStepDataKey(step);
    session.data = {
      ...session.data,
      [key]: data,
    };
    session.currentStep = step;
    session.updatedAt = new Date();

    if (!session.completedSteps.includes(step)) {
      session.completedSteps.push(step);
    }

    this.logger.log(`Updated onboarding data for step: ${step}`);

    return {
      success: true,
      message: `Step ${step} data saved`,
    };
  }

  getOnboardingProgress(onboardingId: string): OnboardingProgressDto {
    const session = this.onboardingSessions.get(onboardingId);
    if (!session) {
      throw new BadRequestException('Onboarding session not found or expired');
    }

    return {
      onboardingId,
      currentStep: session.currentStep,
      completedSteps: session.completedSteps,
      data: session.data,
    };
  }

  getSessionData(onboardingId: string): Partial<CompleteOnboardingDto> {
    const session = this.onboardingSessions.get(onboardingId);
    if (!session) {
      throw new BadRequestException('Onboarding session not found or expired');
    }
    return session.data;
  }

  clearSession(onboardingId: string): void {
    this.onboardingSessions.delete(onboardingId);
    this.logger.log(`Cleared onboarding session: ${onboardingId}`);
  }

  onModuleDestroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }

  private generateOnboardingId(): string {
    return `onb_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  private getStepDataKey(step: OnboardingStep): string {
    const keyMap = {
      [OnboardingStep.CLINIC_DETAILS]: 'clinicDetails',
      [OnboardingStep.ADMIN_ACCOUNT]: 'adminAccount',
      [OnboardingStep.PLAN_SELECTION]: 'planSelection',
      [OnboardingStep.PAYMENT_DETAILS]: 'paymentDetails',
      [OnboardingStep.SLA_AGREEMENT]: 'slaAgreement',
      [OnboardingStep.CONSENT_MANAGEMENT]: 'consentManagement',
      [OnboardingStep.STAFF_SETUP]: 'staffSetup',
    };
    return keyMap[step as keyof typeof keyMap] || step.toLowerCase();
  }

  private cleanExpiredSessions() {
    const now = new Date();
    for (const [id, session] of this.onboardingSessions.entries()) {
      if (session.expiresAt < now) {
        this.onboardingSessions.delete(id);
        this.logger.log(`Cleaned expired onboarding session: ${id}`);
      }
    }
  }
}
