import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../../../prisma/prisma.service';
import { AuthService } from '../../../../../shared/modules/auth/auth/auth.service';
import { SubscriptionStatus } from '@workspace/db';
import type {
  CompleteOnboardingDto,
  OnboardingProgressDto,
  OnboardingStep,
} from '../../dto/onboarding/create-clinic-onboarding.dto';
import { ClinicTier } from '../../dto/onboarding/create-clinic-onboarding.dto';
import { OnboardingDataService } from './onboarding-data.service';
import { OnboardingValidationService } from './onboarding-validation.service';
import { OnboardingWorkflowService } from './onboarding-workflow.service';
import { OnboardingComplianceService } from './onboarding-compliance.service';

interface OnboardingResult {
  success: boolean;
  clinicId: string;
  userId: string;
  subscriptionId?: string;
  message: string;
  errors?: string[];
  access_token?: string;
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
    clinicId: string | null;
  };
}

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    private prisma: PrismaService,
    private authService: AuthService,
    private dataService: OnboardingDataService,
    private validationService: OnboardingValidationService,
    private workflowService: OnboardingWorkflowService,
    private complianceService: OnboardingComplianceService,
  ) {}

  initializeOnboarding(): { onboardingId: string } {
    return this.dataService.initializeOnboarding();
  }

  updateOnboardingStep(
    onboardingId: string,
    step: OnboardingStep,
    data: Partial<CompleteOnboardingDto>,
  ): OnboardingProgressDto {
    this.dataService.updateOnboardingData(onboardingId, step, data);
    return this.dataService.getOnboardingProgress(onboardingId);
  }

  getOnboardingProgress(onboardingId: string): OnboardingProgressDto {
    return this.dataService.getOnboardingProgress(onboardingId);
  }

  async completeOnboarding(
    onboardingId: string,
    completeData: CompleteOnboardingDto,
    ipAddress?: string,
  ): Promise<OnboardingResult> {
    const sessionData = this.dataService.getSessionData(onboardingId);
    if (!sessionData) {
      throw new BadRequestException('Onboarding session not found or expired');
    }

    let clinicId: string | undefined;
    let userId: string | undefined;

    try {
      const validation =
        this.validationService.validateOnboardingCompletion(completeData);
      if (!validation.valid) {
        return {
          success: false,
          clinicId: '',
          userId: '',
          message: 'Onboarding validation failed',
          errors: validation.errors,
        };
      }

      const result = await this.prisma.$transaction(async (tx) => {
        const clinic = await this.workflowService.createClinic(
          tx,
          completeData.clinicDetails,
          ipAddress,
        );
        clinicId = clinic.id;

        const adminUser = await this.workflowService.createAdminUser(
          tx,
          completeData.adminAccount,
          clinic.id,
          ipAddress,
        );
        userId = adminUser.id;

        let subscriptionId: string;
        if (completeData.planSelection.tier !== ClinicTier.CAPTURE) {
          const subscription = await this.workflowService.createSubscription(
            tx,
            clinic.id,
            completeData.planSelection,
            completeData.paymentDetails,
          );
          subscriptionId = subscription.id;
        } else {
          const subscription = await tx.subscription.create({
            data: {
              clinicId: clinic.id,
              plan: 'CAPTURE',
              billingCycle: 'MONTHLY',
              basePriceCents: 0,
              status: SubscriptionStatus.ACTIVE,
              currentPeriodStart: new Date(),
              currentPeriodEnd: new Date(
                Date.now() + 365 * 24 * 60 * 60 * 1000,
              ), // 1 year
            },
          });
          subscriptionId = subscription.id;
        }

        await this.complianceService.recordSLAAgreement(
          tx,
          clinic.id,
          adminUser.id,
          completeData.slaAgreement,
          ipAddress,
        );

        await this.complianceService.configureConsentManagement(
          tx,
          clinic.id,
          completeData.consentManagement,
        );

        if (completeData.staffSetup?.staffMembers?.length) {
          const staffCount = await this.workflowService.createStaffMembers(
            tx,
            clinic.id,
            completeData.staffSetup,
            ipAddress,
          );
          this.logger.log(`Created ${staffCount} staff members`);
        }

        await this.workflowService.initializeClinicSettings(tx, clinic.id);

        return {
          clinic,
          adminUser,
          subscriptionId,
        };
      });

      this.dataService.clearSession(onboardingId);

      await this.complianceService.logOnboardingEvent(
        result.adminUser.id,
        result.clinic.id,
        'CLINIC_ONBOARDED',
        {
          tier: completeData.planSelection.tier,
          billingCycle: completeData.planSelection.billingCycle,
          onboardingId,
        },
      );

      this.logger.log(
        `Onboarding completed successfully for clinic: ${result.clinic.id}`,
      );

      const authCredentials = await this.authService.login({
        id: result.adminUser.id,
        email: result.adminUser.email,
        name: result.adminUser.name,
        role: result.adminUser.role,
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
    } catch (error) {
      this.logger.error(
        `Onboarding failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );

      if (clinicId && userId) {
        await this.complianceService.logOnboardingEvent(
          userId,
          clinicId,
          'CLINIC_ONBOARDING_FAILED',
          {
            error: error instanceof Error ? error.message : 'Unknown error',
            onboardingId,
          },
        );
      }

      return {
        success: false,
        clinicId: clinicId || '',
        userId: userId || '',
        message: 'Onboarding failed. Please try again.',
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }
}
