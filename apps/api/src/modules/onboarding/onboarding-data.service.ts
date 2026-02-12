import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import {
  OnboardingStep,
  OnboardingProgressDto,
} from './dto/create-clinic-onboarding.dto';
import type { CompleteOnboardingDto } from './dto/create-clinic-onboarding.dto';

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
export class OnboardingDataService {
  private readonly logger = new Logger(OnboardingDataService.name);
  // In-memory session storage (in production, use Redis)
  private onboardingSessions = new Map<string, OnboardingSession>();

  constructor() {
    // Clean up expired sessions every hour
    setInterval(() => this.cleanExpiredSessions(), 3600000);
  }

  /**
   * Initialize onboarding session
   * Creates a temporary session to track multi-step onboarding
   */
  initializeOnboarding(): { onboardingId: string } {
    const onboardingId = this.generateOnboardingId();
    const session: OnboardingSession = {
      id: onboardingId,
      currentStep: OnboardingStep.CLINIC_DETAILS,
      completedSteps: [],
      data: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    };

    this.onboardingSessions.set(onboardingId, session);
    this.logger.log(`Initialized onboarding session: ${onboardingId}`);

    return { onboardingId };
  }

  /**
   * Update onboarding data for a step
   */
  updateOnboardingData(
    onboardingId: string,
    step: OnboardingStep,
    data: any,
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

  /**
   * Get onboarding progress
   */
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

  /**
   * Get session data
   */
  getSessionData(onboardingId: string): Partial<CompleteOnboardingDto> {
    const session = this.onboardingSessions.get(onboardingId);
    if (!session) {
      throw new BadRequestException('Onboarding session not found or expired');
    }
    return session.data;
  }

  /**
   * Clear session (after completion or expiry)
   */
  clearSession(onboardingId: string): void {
    this.onboardingSessions.delete(onboardingId);
    this.logger.log(`Cleared onboarding session: ${onboardingId}`);
  }

  /**
   * Generate unique onboarding ID
   */
  private generateOnboardingId(): string {
    return `onb_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Get data key for a specific step
   */
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
    return keyMap[step] || step.toLowerCase();
  }

  /**
   * Clean up expired sessions
   */
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
