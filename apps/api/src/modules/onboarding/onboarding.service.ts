import {
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { SubscriptionStatus } from '@workspace/db';
import type {
  CompleteOnboardingDto,
  OnboardingProgressDto,
  OnboardingStep,
} from './dto/create-clinic-onboarding.dto';
import { ClinicTier } from './dto/create-clinic-onboarding.dto';
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

/**
 * OnboardingService Facade
 * Orchestrates all onboarding workflows using specialized services:
 * - OnboardingDataService: Session management
 * - OnboardingValidationService: Data validation & pricing logic
 * - OnboardingWorkflowService: Clinic/user/subscription creation
 * - OnboardingComplianceService: DPDP/SLA/consent management
 */
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

  /**
   * Initialize onboarding session
   * Delegates to OnboardingDataService
   */
  initializeOnboarding(): { onboardingId: string } {
    return this.dataService.initializeOnboarding();
  }

  /**
   * Update onboarding progress
   * Saves data for each step and returns progress
   * Delegates to OnboardingDataService
   */
  updateOnboardingStep(
    onboardingId: string,
    step: OnboardingStep,
    data: Partial<CompleteOnboardingDto>,
  ): OnboardingProgressDto {
    this.dataService.updateOnboardingData(onboardingId, step, data);
    return this.dataService.getOnboardingProgress(onboardingId);
  }

  /**
   * Get onboarding progress
   * Delegates to OnboardingDataService
   */
  getOnboardingProgress(onboardingId: string): OnboardingProgressDto {
    return this.dataService.getOnboardingProgress(onboardingId);
  }

  /**
   * Complete onboarding - Main orchestrator
   * Coordinates all services to:
   * 1. Create clinic (OnboardingWorkflowService)
   * 2. Create admin user (OnboardingWorkflowService)
   * 3. Create subscription (OnboardingWorkflowService)
   * 4. Record SLA agreement (OnboardingComplianceService)
   * 5. Configure consent management (OnboardingComplianceService)
   * 6. Create staff members (OnboardingWorkflowService)
   * 7. Initialize clinic settings (OnboardingWorkflowService)
   * 8. Log audit events (OnboardingComplianceService)
   * 9. Generate auth token (AuthService)
   *
   * All steps run in a transaction for atomicity
   */
  async completeOnboarding(
    onboardingId: string,
    completeData: CompleteOnboardingDto,
    ipAddress?: string,
  ): Promise<OnboardingResult> {
    // Verify session exists
    const sessionData = this.dataService.getSessionData(onboardingId);
    if (!sessionData) {
      throw new BadRequestException(
        'Onboarding session not found or expired',
      );
    }

    let clinicId: string | undefined;
    let userId: string | undefined;

    try {
      // Validate all required data
      const validation = this.validationService.validateOnboardingCompletion(
        completeData,
      );
      if (!validation.valid) {
        return {
          success: false,
          clinicId: '',
          userId: '',
          message: 'Onboarding validation failed',
          errors: validation.errors,
        };
      }

      // Execute all steps in a transaction for atomicity
      const result = await this.prisma.$transaction(async (tx) => {
        // Step 1: Create clinic
        const clinic = await this.workflowService.createClinic(
          tx,
          completeData.clinicDetails,
          ipAddress,
        );
        clinicId = clinic.id;

        // Step 2: Create admin user
        const adminUser = await this.workflowService.createAdminUser(
          tx,
          completeData.adminAccount,
          clinic.id,
          ipAddress,
        );
        userId = adminUser.id;

        // Step 3: Create subscription
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
          // Free tier: create minimal subscription
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

        // Step 4: Record SLA agreement (DPDP Compliance)
        await this.complianceService.recordSLAAgreement(
          tx,
          clinic.id,
          adminUser.id,
          completeData.slaAgreement,
          ipAddress,
        );

        // Step 5: Configure consent management (DPDP Compliance)
        await this.complianceService.configureConsentManagement(
          tx,
          clinic.id,
          completeData.consentManagement,
        );

        // Step 6: Create staff members (optional)
        if (completeData.staffSetup?.staffMembers?.length) {
          const staffCount = await this.workflowService.createStaffMembers(
            tx,
            clinic.id,
            completeData.staffSetup,
            ipAddress,
          );
          this.logger.log(`Created ${staffCount} staff members`);
        }

        // Step 7: Initialize clinic settings
        await this.workflowService.initializeClinicSettings(tx, clinic.id);

        return {
          clinic,
          adminUser,
          subscriptionId,
        };
      });

      // Clear session after successful completion
      this.dataService.clearSession(onboardingId);

      // Step 8: Log audit event (outside transaction to avoid deadlock)
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

      // Step 9: Generate JWT token for automatic login
      const authPayload = {
        id: result.adminUser.id,
        email: result.adminUser.email,
        name: result.adminUser.name,
        role: result.adminUser.role,
        clinicId: result.clinic.id,
      };
      const authCredentials = await this.authService.login({
        ...authPayload,
        clinicId: result.clinic.id,
      } as any);

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
      this.logger.error(`Onboarding failed: ${error.message}`, error.stack);

      // Log failure event
      if (clinicId && userId) {
        await this.complianceService.logOnboardingEvent(
          userId,
          clinicId,
          'CLINIC_ONBOARDING_FAILED',
          {
            error: error.message,
            onboardingId,
          },
        );
      }

      return {
        success: false,
        clinicId: clinicId || '',
        userId: userId || '',
        message: 'Onboarding failed. Please try again.',
        errors: [error.message],
      };
    }
  }
}
