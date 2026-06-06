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
import { OnboardingDataService } from './onboarding-data.service';
import { OnboardingValidationService } from './onboarding-validation.service';
import { OnboardingWorkflowService } from './onboarding-workflow.service';
import { OnboardingComplianceService } from './onboarding-compliance.service';
import { UploadsService } from '@/domains/documents/application/services/uploads.service';
import {
  hasPriorSubscriptionForEmail,
  createSlaSignatureSession,
  uploadSlaSignature,
  getSlaSignatureSessionStatus,
} from './onboarding-helpers';
import {
  logOnboardingSuccess,
  buildSuccessfulOnboardingResult,
  handleOnboardingFailure,
  buildValidationFailureResult,
} from './onboarding-result.helpers';
import { OnboardingPaymentValidator } from './onboarding-payment-validation';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { OnboardingPaymentService } from './onboarding-payment.service';
import type { OnboardingResult } from './onboarding-result.types';
import type {
  OnboardingTx,
  CompletedOnboardingRecords,
  OnboardingCreationMarkers,
} from './onboarding.types';
import { isFrontDeskPlanMode } from '@workspace/types';

/**
 * Facade — delegates checkout, progress, and compliance to onboarding specialists;
 * real logic lives in OnboardingWorkflowService.
 */
@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);
  private paymentValidator: OnboardingPaymentValidator;

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
  ) {
    this.paymentValidator = new OnboardingPaymentValidator(
      persistence,
      paymentGateway,
      {
        getTierPricing:
          validationService.getTierPricing.bind(validationService),
      },
    );
  }

  createCheckout(onboardingId: string, data: OnboardingCheckoutDto) {
    return this.paymentService.createCheckout(onboardingId, data);
  }

  async getTrialEligibility(onboardingId: string, email: string) {
    const sessionData = await this.dataService.getSessionData(onboardingId);
    if (!sessionData)
      throw new BadRequestException('Onboarding session not found or expired');
    return {
      eligible: !(await hasPriorSubscriptionForEmail(this.persistence, email)),
    };
  }

  async createSlaSignatureSession(onboardingId: string) {
    const sessionData = await this.dataService.getSessionData(onboardingId);
    if (!sessionData)
      throw new BadRequestException('Onboarding session not found or expired');
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
    return getSlaSignatureSessionStatus(
      this.persistence,
      onboardingId,
      sessionId,
    );
  }

  initializeOnboarding(): Promise<{ onboardingId: string }> {
    return this.dataService.initializeOnboarding();
  }

  async updateOnboardingStep(
    onboardingId: string,
    step: OnboardingStep,
    data: Partial<CompleteOnboardingDto>,
  ): Promise<OnboardingProgressDto> {
    await this.dataService.updateOnboardingData(onboardingId, step, data);
    return this.dataService.getOnboardingProgress(onboardingId);
  }

  getOnboardingProgress(onboardingId: string): Promise<OnboardingProgressDto> {
    return this.dataService.getOnboardingProgress(onboardingId);
  }

  async completeOnboarding(
    onboardingId: string,
    completeData: CompleteOnboardingDto,
    ipAddress?: string,
  ): Promise<OnboardingResult> {
    const sessionData = await this.dataService.getSessionData(onboardingId);
    if (!sessionData)
      throw new BadRequestException('Onboarding session not found or expired');

    const created: OnboardingCreationMarkers = {};

    try {
      const validationFailure = buildValidationFailureResult(
        this.validationService,
        completeData,
      );
      if (validationFailure !== null) return validationFailure;

      await this.paymentValidator.validatePayment(completeData);

      const result = await this.createOnboardingRecords(
        completeData,
        ipAddress,
        created,
      );

      await this.dataService.clearSession(onboardingId);
      await logOnboardingSuccess(
        this.complianceService,
        result,
        completeData,
        onboardingId,
      );

      this.logger.log(
        `Onboarding completed successfully for clinic: ${result.clinic.id}`,
      );

      return await buildSuccessfulOnboardingResult(this.authService, result);
    } catch (error) {
      return await handleOnboardingFailure(
        this.complianceService,
        error,
        onboardingId,
        created,
      );
    }
  }

  private async createOnboardingRecords(
    completeData: CompleteOnboardingDto,
    ipAddress: string | undefined,
    created: OnboardingCreationMarkers,
  ): Promise<CompletedOnboardingRecords> {
    // RLS-BYPASS: onboarding creates clinic records before membership tenant binding
    return this.persistence.runUnrestricted(async () =>
      this.persistence.$transaction((tx) =>
        this.createOnboardingRecordsInTransaction(
          tx,
          completeData,
          ipAddress,
          created,
        ),
      ),
    );
  }

  private async createOnboardingRecordsInTransaction(
    tx: OnboardingTx,
    completeData: CompleteOnboardingDto,
    ipAddress: string | undefined,
    created: OnboardingCreationMarkers,
  ): Promise<CompletedOnboardingRecords> {
    const clinic = await this.workflowService.createClinic(
      tx,
      completeData.clinicDetails,
      ipAddress,
    );
    created.clinicId = clinic.id;

    const adminUser = await this.workflowService.createAdminUser(
      tx,
      completeData.adminAccount,
      clinic.id,
      ipAddress,
      completeData.planSelection.tier,
      completeData.planSelection.planMode,
    );
    created.userId = adminUser.id;

    const subscription = await this.workflowService.createSubscription(
      tx,
      clinic.id,
      completeData.planSelection,
      completeData.paymentDetails,
    );

    await this.configureClinicAfterCreation(
      tx,
      completeData,
      clinic.id,
      adminUser.id,
      ipAddress,
    );

    return { clinic, adminUser, subscriptionId: subscription.id };
  }

  private async configureClinicAfterCreation(
    tx: OnboardingTx,
    completeData: CompleteOnboardingDto,
    clinicId: string,
    adminUserId: string,
    ipAddress: string | undefined,
  ): Promise<void> {
    await this.complianceService.recordSLAAgreement(
      tx,
      clinicId,
      adminUserId,
      completeData.slaAgreement,
      ipAddress,
    );

    await this.complianceService.configureConsentManagement(
      tx,
      clinicId,
      completeData.consentManagement,
    );

    await this.createStaffMembersIfProvided(
      tx,
      completeData,
      clinicId,
      ipAddress,
    );
    await this.ensureFrontDeskScheduleDoctorIfNeeded(
      tx,
      completeData,
      clinicId,
    );
    await this.workflowService.initializeClinicSettings(tx, clinicId);
    await this.replaceClinicWeeklySchedules(tx, completeData, clinicId);
  }

  private async createStaffMembersIfProvided(
    tx: OnboardingTx,
    completeData: CompleteOnboardingDto,
    clinicId: string,
    ipAddress: string | undefined,
  ): Promise<void> {
    if (!completeData.staffSetup?.staffMembers?.length) return;

    const staffCount = await this.workflowService.createStaffMembers(
      tx,
      clinicId,
      completeData.staffSetup,
      ipAddress,
      completeData.planSelection.tier,
      completeData.planSelection.planMode,
    );
    this.logger.log(`Created ${staffCount} staff members`);
  }

  private async ensureFrontDeskScheduleDoctorIfNeeded(
    tx: OnboardingTx,
    completeData: CompleteOnboardingDto,
    clinicId: string,
  ): Promise<void> {
    if (
      !isFrontDeskPlanMode(
        completeData.planSelection.tier,
        completeData.planSelection.planMode,
      )
    ) {
      return;
    }

    await this.workflowService.ensureFrontDeskScheduleDoctor(tx, clinicId);
  }

  private async replaceClinicWeeklySchedules(
    tx: OnboardingTx,
    completeData: CompleteOnboardingDto,
    clinicId: string,
  ): Promise<void> {
    const weeklyRows =
      completeData.clinicWeeklyHours &&
      completeData.clinicWeeklyHours.length === 7
        ? completeData.clinicWeeklyHours
        : this.workflowService.getDefaultClinicWeeklyHoursInput();
    await this.workflowService.replaceClinicWeeklySchedules(
      tx,
      clinicId,
      weeklyRows,
    );
  }
}
