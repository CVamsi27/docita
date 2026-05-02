import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AuthService } from '@/shared/modules/auth/auth/auth.service';
import { SubscriptionStatus } from '@workspace/db';
import { UploadSessionPurpose } from '@workspace/db';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
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
    private uploadsService: UploadsService,
    private configService: AppConfigService,
    @Inject(PAYMENT_GATEWAY_TOKEN)
    private paymentGateway: IPaymentGateway,
  ) {}

  async createCheckout(onboardingId: string, data: OnboardingCheckoutDto) {
    const sessionData = this.dataService.getSessionData(onboardingId);
    if (!sessionData) {
      throw new BadRequestException('Onboarding session not found or expired');
    }

    const amountCents = this.validationService.getTierPricing(
      data.tier,
      data.billingCycle,
      data.currency,
    );

    if (
      this.validationService.validateTier(data.tier) &&
      this.validationService.validateBillingCycle(data.billingCycle) &&
      data.currency?.toUpperCase() === 'INR' &&
      amountCents > 0 &&
      !data.gstin
    ) {
      throw new BadRequestException(
        'GSTIN is required before charging paid Indian plans',
      );
    }

    if (amountCents <= 0) {
      throw new BadRequestException(
        'Selected plan does not support direct checkout',
      );
    }

    const order = await this.paymentGateway.createOrder({
      amountCents,
      currency: data.currency || this.configService.getCurrencyCode(),
      customerId: `onboarding-${onboardingId}`,
      customerEmail: data.customerEmail,
      customerPhone: data.customerPhone,
      orderId: crypto.randomUUID(),
      description: `Docita ${data.tier} - ${data.billingCycle}`,
      notes: {
        onboardingId,
        tier: data.tier,
        cycle: data.billingCycle,
        customerName: data.customerName,
      },
    });

    return {
      orderId: order.razorpayOrderId,
      amountCents: order.amountCents,
      currency: order.currency,
      razorpayKeyId: this.configService.getRazorpayKeyId() || '',
    };
  }

  async createSlaSignatureSession(onboardingId: string) {
    const sessionData = this.dataService.getSessionData(onboardingId);
    if (!sessionData) {
      throw new BadRequestException('Onboarding session not found or expired');
    }

    return this.uploadsService.createSession({
      expiresInMinutes: 20,
      purpose: UploadSessionPurpose.GENERAL,
    });
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
    const session = await this.prisma.uploadSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Signature session not found');
    }

    if (session.expiresAt < new Date()) {
      throw new BadRequestException(
        'This signature link has expired. Please generate a new link from onboarding.',
      );
    }

    if (session.status === 'uploaded' && session.fileUrl) {
      throw new BadRequestException(
        'This signature link has already been used.',
      );
    }

    const updated = await this.uploadsService.updateSession(sessionId, file, {
      onboardingId,
      modifiedBy: context?.modifiedBy,
      modifiedByRole: context?.modifiedByRole,
      authMethod: context?.modifiedBy ? 'session-auth' : 'onboarding-session',
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      uploadSecret,
    });

    // One-time onboarding signature links should not be reused after upload.
    await this.prisma.uploadSession.update({
      where: { id: sessionId },
      data: { expiresAt: new Date() },
    });

    return updated;
  }

  async getSlaSignatureSessionStatus(
    onboardingId: string,
    sessionId: string,
  ): Promise<{ status: string; uploaded: boolean; fileUrl: string | null }> {
    void onboardingId;

    const session = await this.prisma.uploadSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) {
      throw new NotFoundException('Signature session not found');
    }

    if (session.purpose !== UploadSessionPurpose.GENERAL) {
      throw new NotFoundException('Signature session not found');
    }

    return {
      status: session.status,
      uploaded: session.status === 'uploaded' || !!session.fileUrl,
      fileUrl: session.fileUrl,
    };
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

      if (
        completeData.planSelection.tier !== ClinicTier.STARTER &&
        !completeData.paymentDetails?.skipPayment &&
        hasRazorpayPayment
      ) {
        const expectedAmountCents = this.validationService.getTierPricing(
          completeData.planSelection.tier,
          completeData.planSelection.billingCycle,
          completeData.planSelection.currency,
        );

        const verification = await this.paymentGateway.verifyPayment({
          razorpayPaymentId: completeData.paymentDetails!.razorpayPaymentId!,
          razorpayOrderId: completeData.paymentDetails!.razorpayOrderId!,
          razorpaySignature: completeData.paymentDetails!.razorpaySignature!,
        });

        if (!verification.verified) {
          throw new BadRequestException('Unable to verify payment');
        }

        if (verification.amountCents !== expectedAmountCents) {
          throw new BadRequestException(
            'Payment amount does not match selected plan',
          );
        }
      }

      const result = await this.prisma.runUnrestricted(async () => {
        return this.prisma.$transaction(async (tx) => {
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
          if (completeData.planSelection.tier !== ClinicTier.STARTER) {
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
                plan: 'STARTER',
                billingCycle: 'MONTHLY',
                basePriceCents: 0,
                status: SubscriptionStatus.ACTIVE,
                currentPeriodStart: new Date(),
                currentPeriodEnd: new Date(
                  Date.now() + 365 * 24 * 60 * 60 * 1000,
                ),
              },
            });
            await tx.clinic.update({
              where: { id: clinic.id },
              data: {
                tier: ClinicTier.STARTER,
                subscriptionStatus: SubscriptionStatus.ACTIVE,
                trialEndsAt: null,
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
