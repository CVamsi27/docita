import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import {
  CLINIC_PERSISTENCE_PORT,
  type ClinicPersistencePort,
} from '@/domains/clinics/application/ports/clinic-persistence.port';
import { AuthService } from '@/shared/modules/auth/auth/auth.service';
import {
  PAYMENT_GATEWAY_TOKEN,
  type IPaymentGateway,
} from '@/domains/subscriptions/application/ports';
import type {
  CompleteOnboardingDto,
  OnboardingCheckoutDto,
  OnboardingProgressDto,
  OnboardingStep,
} from '@/domains/clinics/application/dto/onboarding/create-clinic-onboarding.dto';
import { ClinicTier } from '@/domains/clinics/application/dto/onboarding/create-clinic-onboarding.dto';
import { OnboardingDataService } from './onboarding-data.service';
import { OnboardingValidationService } from './onboarding-validation.service';
import { OnboardingWorkflowService } from './onboarding-workflow.service';
import { OnboardingComplianceService } from './onboarding-compliance.service';
import { UploadsService } from '@/domains/documents/application/services/uploads.service';
import { isFrontDeskWorkspace, parseWorkspaceProfile } from '@workspace/types';
import {
  hasPriorPaidSubscriptionForEmail,
  createSlaSignatureSession,
  uploadSlaSignature,
  getSlaSignatureSessionStatus,
} from './onboarding-helpers';
import {
  CLOCK_PORT,
  type IClock,
} from '@/shared/common/ports/clock.port';
import { OnboardingPaymentService } from './onboarding-payment.service';
import type { OnboardingResult } from './onboarding-result.types';

/**
 * Facade — delegates checkout, progress, and compliance to onboarding specialists;
 * real logic lives in OnboardingWorkflowService.
 */
@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);
  constructor(
    @Inject(CLINIC_PERSISTENCE_PORT)
    private persistence: ClinicPersistencePort,
    private authService: AuthService,
    private dataService: OnboardingDataService,
    private validationService: OnboardingValidationService,
    private workflowService: OnboardingWorkflowService,
    private complianceService: OnboardingComplianceService,
    private uploadsService: UploadsService,
    private paymentService: OnboardingPaymentService,
    @Inject(PAYMENT_GATEWAY_TOKEN)
    private paymentGateway: IPaymentGateway,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  createCheckout(onboardingId: string, data: OnboardingCheckoutDto) {
    return this.paymentService.createCheckout(onboardingId, data);
  }

  async createSlaSignatureSession(onboardingId: string) {
    const sessionData = this.dataService.getSessionData(onboardingId);
    if (!sessionData) {
      throw new BadRequestException('Onboarding session not found or expired');
    }
    return createSlaSignatureSession(onboardingId, this.uploadsService);
  }

  async uploadSlaSignature(
    onboardingId: string,
    sessionId: string,
    file: Express.Multer.File,
    uploadSecret: string,
    context?: {
      modifiedBy?: string;
      modifiedByRole?: string;
      ipAddress?: string;
      userAgent?: string;
    },
  ) {
    return uploadSlaSignature(
      this.persistence,
      this.uploadsService,
      onboardingId,
      sessionId,
      file,
      uploadSecret,
      this.clock.now(),
      context,
    );
  }

  async getSlaSignatureSessionStatus(onboardingId: string, sessionId: string) {
    return getSlaSignatureSessionStatus(this.persistence, onboardingId, sessionId);
  }

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

      const hasRazorpayPayment =
        !!completeData.paymentDetails?.razorpayPaymentId &&
        !!completeData.paymentDetails?.razorpayOrderId &&
        !!completeData.paymentDetails?.razorpaySignature;

      const listPriceCents = this.validationService.getTierPricing(
        completeData.planSelection.tier,
        completeData.planSelection.billingCycle,
        completeData.planSelection.currency,
      );

      const isUnpaidEssentialTrial =
        completeData.planSelection.tier === ClinicTier.ESSENTIAL &&
        completeData.paymentDetails?.skipPayment === true;

      // Free trial re-use prevention: prior paid subscriptions must use
      // checkout instead of another trial.
      if (isUnpaidEssentialTrial) {
        const hasPriorPaid = await hasPriorPaidSubscriptionForEmail(
          this.persistence,
          completeData.adminAccount.email,
        );
        if (hasPriorPaid) {
          throw new BadRequestException(
            'The 30-day free trial is only available to new customers. Please choose a paid plan to continue.',
          );
        }
      }

      if (listPriceCents > 0 && !isUnpaidEssentialTrial && hasRazorpayPayment) {
        const verification = await this.paymentGateway.verifyPayment({
          razorpayPaymentId: completeData.paymentDetails!.razorpayPaymentId!,
          razorpayOrderId: completeData.paymentDetails!.razorpayOrderId!,
          razorpaySignature: completeData.paymentDetails!.razorpaySignature!,
        });

        if (!verification.verified) {
          throw new BadRequestException('Unable to verify payment');
        }

        if (verification.amountCents !== listPriceCents) {
          throw new BadRequestException(
            'Payment amount does not match selected plan',
          );
        }
      }

      const resolvedWorkspaceProfile =
        completeData.planSelection.tier === ClinicTier.FRONT_DESK
          ? 'FRONT_DESK'
          : completeData.planSelection.workspaceProfile;

      const result = await this.persistence.runUnrestricted(async () => {
        return this.persistence.$transaction(async (tx) => {
          const clinic = await this.workflowService.createClinic(
            tx,
            completeData.clinicDetails,
            ipAddress,
            resolvedWorkspaceProfile,
          );
          clinicId = clinic.id;

          const adminUser = await this.workflowService.createAdminUser(
            tx,
            completeData.adminAccount,
            clinic.id,
            ipAddress,
            completeData.planSelection.tier,
          );
          userId = adminUser.id;

          const subscription = await this.workflowService.createSubscription(
            tx,
            clinic.id,
            completeData.planSelection,
            completeData.paymentDetails,
          );
          const subscriptionId = subscription.id;

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
              completeData.planSelection.tier,
            );
            this.logger.log(`Created ${staffCount} staff members`);
          }

          if (
            completeData.planSelection.tier === ClinicTier.FRONT_DESK ||
            isFrontDeskWorkspace(
              parseWorkspaceProfile(resolvedWorkspaceProfile),
            )
          ) {
            await this.workflowService.ensureFrontDeskScheduleDoctor(
              tx,
              clinic.id,
            );
          }

          await this.workflowService.initializeClinicSettings(tx, clinic.id);

          const weeklyRows =
            completeData.clinicWeeklyHours &&
            completeData.clinicWeeklyHours.length === 7
              ? completeData.clinicWeeklyHours
              : this.workflowService.getDefaultClinicWeeklyHoursInput();
          await this.workflowService.replaceClinicWeeklySchedules(
            tx,
            clinic.id,
            weeklyRows,
          );

          return { clinic, adminUser, subscriptionId };
        });
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
