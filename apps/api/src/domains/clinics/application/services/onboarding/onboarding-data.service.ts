import {
  Inject,
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { randomBytes } from 'crypto';
import {
  OnboardingStep,
  OnboardingProgressDto,
  onboardingSessionDataSchema,
} from '@/domains/clinics/application/dto/onboarding/create-clinic-onboarding.dto';
import type { OnboardingSessionDataDto } from '@/domains/clinics/application/dto/onboarding/create-clinic-onboarding.dto';
import {
  CLINIC_PERSISTENCE_PORT,
  type ClinicPersistencePort,
} from '@/domains/clinics/application/ports/clinic-persistence.port';
import { toPrismaInputJsonValue } from '@/shared/common/json/to-prisma-input-json-value';

interface OnboardingSession {
  id: string;
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  data: OnboardingSessionDataDto;
  expiresAt: Date;
}

@Injectable()
export class OnboardingDataService {
  private readonly logger = new Logger(OnboardingDataService.name);

  constructor(
    @Inject(CLOCK_PORT) private readonly clock: IClock,
    @Inject(CLINIC_PERSISTENCE_PORT)
    private readonly persistence: ClinicPersistencePort,
  ) {}

  async initializeOnboarding(): Promise<{ onboardingId: string }> {
    const onboardingId = this.generateOnboardingId();
    const session: OnboardingSession = {
      id: onboardingId,
      currentStep: OnboardingStep.CLINIC_DETAILS,
      completedSteps: [],
      data: {},
      expiresAt: new Date(this.clock.now().getTime() + 24 * 60 * 60 * 1000),
    };

    await this.persistence.onboardingSession.create({
      data: {
        id: session.id,
        currentStep: session.currentStep,
        completedSteps: toPrismaInputJsonValue(session.completedSteps),
        data: toPrismaInputJsonValue(session.data),
        expiresAt: session.expiresAt,
      },
    });
    this.logger.log(`Initialized onboarding session: ${onboardingId}`);

    return { onboardingId };
  }

  async updateOnboardingData(
    onboardingId: string,
    step: OnboardingStep,
    data: Record<string, unknown>,
  ): Promise<{ success: boolean; message: string }> {
    const session = await this.getActiveSession(onboardingId);

    const key = this.getStepDataKey(step);
    const nextData = {
      ...session.data,
      [key]: data,
    };
    const completedSteps = session.completedSteps.includes(step)
      ? session.completedSteps
      : [...session.completedSteps, step];

    await this.persistence.onboardingSession.update({
      where: { id: onboardingId },
      data: {
        currentStep: step,
        completedSteps: toPrismaInputJsonValue(completedSteps),
        data: toPrismaInputJsonValue(nextData),
      },
    });

    this.logger.log(`Updated onboarding data for step: ${step}`);

    return {
      success: true,
      message: `Step ${step} data saved`,
    };
  }

  async getOnboardingProgress(
    onboardingId: string,
  ): Promise<OnboardingProgressDto> {
    const session = await this.getActiveSession(onboardingId);

    return {
      onboardingId,
      currentStep: session.currentStep,
      completedSteps: session.completedSteps,
      data: session.data,
    };
  }

  async getSessionData(
    onboardingId: string,
  ): Promise<OnboardingSessionDataDto> {
    const session = await this.getActiveSession(onboardingId);
    return session.data;
  }

  async clearSession(onboardingId: string): Promise<void> {
    await this.persistence.onboardingSession.deleteMany({
      where: { id: onboardingId },
    });
    this.logger.log(`Cleared onboarding session: ${onboardingId}`);
  }

  async cleanExpiredSessions(): Promise<number> {
    const result = await this.persistence.onboardingSession.deleteMany({
      where: { expiresAt: { lt: this.clock.now() } },
    });
    if (result.count > 0) {
      this.logger.log(`Cleaned ${result.count} expired onboarding sessions`);
    }
    return result.count;
  }

  private generateOnboardingId(): string {
    return `onb_${randomBytes(16).toString('hex')}`;
  }

  private getStepDataKey(step: OnboardingStep): string {
    const keyMap: Record<OnboardingStep, string> = {
      [OnboardingStep.CLINIC_DETAILS]: 'clinicDetails',
      [OnboardingStep.ADMIN_ACCOUNT]: 'adminAccount',
      [OnboardingStep.PLAN_SELECTION]: 'planSelection',
      [OnboardingStep.PAYMENT_DETAILS]: 'paymentDetails',
      [OnboardingStep.SLA_AGREEMENT]: 'slaAgreement',
      [OnboardingStep.CONSENT_MANAGEMENT]: 'consentManagement',
      [OnboardingStep.STAFF_SETUP]: 'staffSetup',
      [OnboardingStep.COMPLETED]: 'completed',
    };
    return keyMap[step] ?? step.toLowerCase();
  }

  private async getActiveSession(
    onboardingId: string,
  ): Promise<OnboardingSession> {
    const row = await this.persistence.onboardingSession.findFirst({
      where: {
        id: onboardingId,
        expiresAt: { gt: this.clock.now() },
      },
    });
    if (!row) {
      throw new BadRequestException('Onboarding session not found or expired');
    }

    return {
      id: row.id,
      currentStep: this.parseStep(row.currentStep),
      completedSteps: this.parseCompletedSteps(row.completedSteps),
      data: this.parseSessionData(row.data),
      expiresAt: row.expiresAt,
    };
  }

  private parseStep(value: string): OnboardingStep {
    const parsed = Object.values(OnboardingStep).find((step) => step === value);
    if (!parsed) {
      throw new BadRequestException('Onboarding session is corrupted');
    }
    return parsed;
  }

  private parseCompletedSteps(value: unknown): OnboardingStep[] {
    if (!Array.isArray(value)) return [];
    return value
      .map((step) =>
        typeof step === 'string'
          ? Object.values(OnboardingStep).find((known) => known === step)
          : undefined,
      )
      .filter((step): step is OnboardingStep => Boolean(step));
  }

  private parseSessionData(value: unknown): OnboardingSessionDataDto {
    const parsed = onboardingSessionDataSchema.safeParse(value);
    return parsed.success ? parsed.data : {};
  }
}
