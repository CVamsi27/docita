import {
  Injectable,
  Logger,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthService } from '../../auth/auth.service';
import { SubscriptionBillingService } from '../subscription/subscription-billing.service';
import * as bcrypt from 'bcrypt';
import type { PaymentData } from '@workspace/types';
import {
  validateSpecializationForOnboarding,
  validateClinicTier,
  validateBillingCycle,
  getClinicSettings,
} from './type-helpers';
import {
  CompleteOnboardingDto,
  OnboardingStep,
  OnboardingProgressDto,
  ClinicDetailsDto,
  AdminAccountDto,
  PlanSelectionDto,
  SLAAgreementDto,
  ConsentManagementDto,
  StaffSetupDto,
  ClinicTier,
  BillingCycle,
} from './dto/create-clinic-onboarding.dto';
import type { PrismaTransaction } from '@workspace/types';

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
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);
  // In-memory session storage (in production, use Redis)
  private onboardingSessions = new Map<string, OnboardingSession>();

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private authService: AuthService,
    private subscriptionBilling: SubscriptionBillingService,
  ) {
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
   * Update onboarding progress
   * Saves data for each step and updates progress
   */
  updateOnboardingStep(
    onboardingId: string,
    step: OnboardingStep,
    data: Partial<CompleteOnboardingDto>,
  ): OnboardingProgressDto {
    const session = this.onboardingSessions.get(onboardingId);
    if (!session) {
      throw new BadRequestException('Onboarding session not found or expired');
    }

    // Update session data
    session.data = { ...session.data, [this.getStepDataKey(step)]: data };
    session.currentStep = this.getNextStep(step);
    if (!session.completedSteps.includes(step)) {
      session.completedSteps.push(step);
    }
    session.updatedAt = new Date();

    this.onboardingSessions.set(onboardingId, session);

    this.logger.log(
      `Updated onboarding step: ${step} for session: ${onboardingId}`,
    );

    return {
      onboardingId,
      currentStep: session.currentStep,
      completedSteps: session.completedSteps,
      data: session.data,
    };
  }

  /**
   * Complete onboarding
   * Final step that creates clinic, user, subscription, and all related records
   */
  async completeOnboarding(
    onboardingId: string,
    completeData: CompleteOnboardingDto,
    ipAddress?: string,
  ): Promise<OnboardingResult> {
    const session = this.onboardingSessions.get(onboardingId);
    if (!session) {
      throw new BadRequestException('Onboarding session not found or expired');
    }

    const errors: string[] = [];
    let clinicId: string | undefined;
    let userId: string | undefined;
    let subscriptionId: string | undefined;

    try {
      // Validate all required steps are completed
      this.validateOnboardingCompletion(completeData);

      // Use transaction for atomicity
      const result = await this.prisma.$transaction(async (tx) => {
        // Step 1: Create Clinic
        const clinic = await this.createClinic(
          tx,
          completeData.clinicDetails,
          ipAddress,
        );
        clinicId = clinic.id;
        this.logger.log(`Created clinic: ${clinic.id}`);

        // Step 2: Create Admin User (with password encryption)
        const adminUser = await this.createAdminUser(
          tx,
          completeData.adminAccount,
          clinic.id,
          ipAddress,
        );
        userId = adminUser.id;
        this.logger.log(`Created admin user: ${adminUser.id}`);

        // Step 3: Create Subscription
        if (completeData.planSelection.tier !== ClinicTier.CAPTURE) {
          const subscription = await this.createSubscription(
            tx,
            clinic.id,
            completeData.planSelection,
            completeData.paymentDetails,
          );
          subscriptionId = subscription.id;
          this.logger.log(`Created subscription: ${subscription.id}`);
        } else {
          // For free tier, create a basic subscription record
          const subscription = await tx.subscription.create({
            data: {
              clinicId: clinic.id,
              plan: 'CAPTURE',
              billingCycle: 'MONTHLY',
              basePriceCents: 0,
              status: 'ACTIVE',
              currentPeriodStart: new Date(),
              currentPeriodEnd: new Date(
                Date.now() + 365 * 24 * 60 * 60 * 1000,
              ), // 1 year
            },
          });
          subscriptionId = subscription.id;
        }

        // Step 4: Record SLA Agreement (DPDP Compliance)
        await this.recordSLAAgreement(
          tx,
          clinic.id,
          adminUser.id,
          completeData.slaAgreement,
          ipAddress,
        );
        this.logger.log(`Recorded SLA agreement for clinic: ${clinic.id}`);

        // Step 5: Configure Consent Management (DPDP Compliance)
        await this.configureConsentManagement(
          tx,
          clinic.id,
          completeData.consentManagement,
        );
        this.logger.log(
          `Configured consent management for clinic: ${clinic.id}`,
        );

        // Step 6: Create Staff Members (Optional)
        if (completeData.staffSetup?.staffMembers?.length) {
          await this.createStaffMembers(
            tx,
            clinic.id,
            completeData.staffSetup,
            ipAddress,
          );
          this.logger.log(
            `Created ${completeData.staffSetup.staffMembers.length} staff members`,
          );
        }

        // Step 7: Initialize Clinic Settings
        await this.initializeClinicSettings(tx, clinic.id);

        // Step 8: Audit Log (DPDP Compliance)

        return { clinic, adminUser, subscription: { id: subscriptionId } };
      });

      this.onboardingSessions.delete(onboardingId);

      // Auditing (moved outside transaction to avoid deadlock/visibility issues)
      try {
        await this.auditService.logAction(
          {
            userId: result.adminUser.id,
            clinicId: result.clinic.id,
            actionType: 'CLINIC_ONBOARDED',
            resourceType: 'Clinic',
            resourceId: result.clinic.id,
            metadata: {
              tier: completeData.planSelection.tier,
              billingCycle: completeData.planSelection.billingCycle,
              onboardingId,
            },
            ipAddress,
          },
          true,
        );
      } catch (auditError) {
        this.logger.error(`Failed to log audit action: ${auditError.message}`);
      }

      this.logger.log(
        `Onboarding completed successfully for clinic: ${clinicId}`,
      );

      // Generate JWT token for automatic login
      const authPayload = {
        id: result.adminUser.id,
        email: result.adminUser.email,
        name: result.adminUser.name,
        role: result.adminUser.role,
        clinicId: result.clinic.id,
      };
      const authCredentials = this.authService.login({
        ...authPayload,
        clinicId: result.clinic.id,
      } as any);

      return {
        success: true,
        clinicId: result.clinic.id,
        userId: result.adminUser.id,
        subscriptionId: result.subscription.id,
        message: 'Clinic onboarded successfully. Welcome to Docita!',
        access_token: authCredentials.access_token,
        user: authCredentials.user,
      };
    } catch (error) {
      this.logger.error(`Onboarding failed: ${error.message}`, error.stack);

      // Rollback is automatic with Prisma transactions
      // Log the error for investigation
      if (clinicId && userId) {
        await this.auditService.logAction({
          userId,
          clinicId,
          actionType: 'CLINIC_ONBOARDING_FAILED',
          resourceType: 'Clinic',
          resourceId: clinicId,
          metadata: { error: error.message, onboardingId },
          ipAddress,
        });
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

  /**
   * Create clinic with DPDP compliance metadata
   */
  private async createClinic(
    tx: PrismaTransaction,
    clinicData: ClinicDetailsDto,
    ipAddress?: string,
  ) {
    // Check if clinic with email already exists
    const existingClinic = await tx.clinic.findFirst({
      where: { email: clinicData.email },
    });

    if (existingClinic) {
      throw new ConflictException('Clinic with this email already exists');
    }

    const clinic = await tx.clinic.create({
      data: {
        name: clinicData.name,
        email: clinicData.email,
        phone: clinicData.phone,
        address: clinicData.address,
        type: clinicData.type || 'GENERAL',
        website: clinicData.website,
        mrnPrefix: clinicData.mrnPrefix || 'CLI',
        timezone: clinicData.timezone || 'Asia/Kolkata',
        active: true,
        // DPDP Compliance: Store data processing consent metadata
        settings: {
          dataResidency: clinicData.dataResidency || 'IN',
          privacyComplianceVersion: '1.0',
          onboardedAt: new Date().toISOString(),
          onboardedFromIP: ipAddress,
        },
      },
    });

    // Create MRN sequence for the clinic
    await tx.mrnSequence.create({
      data: {
        clinicId: clinic.id,
        prefix: clinicData.mrnPrefix || 'CLI',
        lastNumber: 0,
      },
    });

    return clinic;
  }

  /**
   * Create admin user with encrypted password
   */
  private async createAdminUser(
    tx: PrismaTransaction,
    adminData: AdminAccountDto,
    clinicId: string,
    ipAddress?: string,
  ) {
    // Check if user with email already exists
    const existingUser = await tx.user.findUnique({
      where: { email: adminData.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Validate password strength
    this.validatePasswordStrength(adminData.password);

    // Hash password using bcrypt (industry standard)
    const hashedPassword = await bcrypt.hash(adminData.password, 10);

    const user = await tx.user.create({
      data: {
        name: adminData.name,
        email: adminData.email,
        password: hashedPassword, // Encrypted password
        phoneNumber: adminData.phoneNumber,
        role: 'ADMIN',
        clinicId,
        qualification: adminData.qualification,
        registrationNumber: adminData.registrationNumber,
        specialization: validateSpecializationForOnboarding(
          adminData.specialization,
        ),
      },
    });

    return user;
  }

  /**
   * Create subscription based on plan selection
   */
  private async createSubscription(
    tx: PrismaTransaction,
    clinicId: string,
    planData: PlanSelectionDto,
    paymentData?: PaymentData,
  ) {
    const now = new Date();
    const periodEnd =
      planData.billingCycle === BillingCycle.YEARLY
        ? new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
        : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Calculate pricing based on tier
    const priceCents = this.getTierPricing(
      validateClinicTier(planData.tier),
      validateBillingCycle(planData.billingCycle),
    );

    const subscription = await tx.subscription.create({
      data: {
        clinicId,
        plan: planData.tier,
        billingCycle: planData.billingCycle,
        basePriceCents: priceCents,
        status: paymentData?.razorpayPaymentId ? 'ACTIVE' : 'PENDING',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        // Set appropriate usage limits based on tier
        ...this.getTierLimits(validateClinicTier(planData.tier)),
      },
    });

    // If payment was provided, record it
    if (paymentData?.razorpayPaymentId) {
      await tx.subscriptionPayment.create({
        data: {
          clinicId,
          subscriptionId: subscription.id,
          amountCents: priceCents,
          status: 'paid',
          razorpayPaymentId: paymentData.razorpayPaymentId,
          razorpayOrderId: paymentData.razorpayOrderId,
          razorpaySignature: paymentData.razorpaySignature,
          description: `${planData.tier} ${planData.billingCycle} subscription`,
        },
      });
    }

    return subscription;
  }

  /**
   * Record SLA agreement with DPDP compliance tracking
   */
  private async recordSLAAgreement(
    tx: PrismaTransaction,
    clinicId: string,
    userId: string,
    slaData: SLAAgreementDto,
    ipAddress?: string,
  ) {
    if (!slaData.acceptedSLA) {
      throw new BadRequestException('SLA must be accepted to proceed');
    }

    if (!slaData.acceptedDataProcessingTerms) {
      throw new BadRequestException('Data processing terms must be accepted');
    }

    if (!slaData.acceptedPrivacyPolicy) {
      throw new BadRequestException('Privacy policy must be accepted');
    }

    // Create audit record for SLA acceptance
    await tx.auditLog.create({
      data: {
        userId,
        clinicId,
        action: 'SLA_ACCEPTED',
        entityType: 'Legal',
        entityId: clinicId,
        metadata: {
          slaVersion: slaData.slaVersion,
          acceptedBy: slaData.acceptedBy,
          acceptedDataProcessingTerms: slaData.acceptedDataProcessingTerms,
          acceptedPrivacyPolicy: slaData.acceptedPrivacyPolicy,
          ipAddress: ipAddress || slaData.ipAddress,
          userAgent: slaData.userAgent,
          timestamp: new Date().toISOString(),
        },
      },
    });

    // Update clinic settings with SLA acceptance
    const clinic = await tx.clinic.findUnique({ where: { id: clinicId } });
    await tx.clinic.update({
      where: { id: clinicId },
      data: {
        settings: {
          ...getClinicSettings(clinic?.settings),
          sla: {
            accepted: true,
            version: slaData.slaVersion,
            acceptedAt: new Date().toISOString(),
            acceptedBy: slaData.acceptedBy,
            acceptedByUserId: userId,
          },
          dataProcessing: {
            termsAccepted: true,
            privacyPolicyAccepted: true,
            acceptedAt: new Date().toISOString(),
          },
        },
      },
    });
  }

  /**
   * Configure consent management for patient communications (DPDP Compliance)
   */
  private async configureConsentManagement(
    tx: PrismaTransaction,
    clinicId: string,
    consentData: ConsentManagementDto,
  ) {
    const clinic = await tx.clinic.findUnique({ where: { id: clinicId } });

    // Update clinic with consent management configuration
    await tx.clinic.update({
      where: { id: clinicId },
      data: {
        whatsappAutomation: {
          enabled: consentData.enableWhatsAppCommunication,
          whatsappBusinessNumber: consentData.whatsappBusinessNumber,
          requireConsentBeforeSending:
            consentData.patientConsentRequiredBeforeWhatsApp,
          logAllMessages: true, // Always log for DPDP compliance
        },
        settings: {
          ...getClinicSettings(clinic?.settings),
          consentManagement: {
            whatsappEnabled: consentData.enableWhatsAppCommunication,
            marketingEnabled: consentData.enableMarketingCommunications,
            dataProcessingPurposes: consentData.dataProcessingPurposes,
            requireExplicitConsent:
              consentData.patientConsentRequiredBeforeWhatsApp,
            logAllConsentChanges: consentData.logAllConsentChanges,
            configuredAt: new Date().toISOString(),
          },
        },
      },
    });
  }

  /**
   * Create staff members
   */
  private async createStaffMembers(
    tx: PrismaTransaction,
    clinicId: string,
    staffData: StaffSetupDto,
    ipAddress?: string,
  ) {
    if (!staffData.staffMembers || staffData.staffMembers.length === 0) {
      return;
    }

    for (const member of staffData.staffMembers) {
      // Check for duplicate emails
      const existing = await tx.user.findUnique({
        where: { email: member.email },
      });

      if (existing) {
        this.logger.warn(
          `Staff member ${member.email} already exists, skipping`,
        );
        continue;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(member.password, 10);

      const newUser = await tx.user.create({
        data: {
          name: member.name,
          email: member.email,
          password: hashedPassword,
          phoneNumber: member.phoneNumber,
          role: member.role,
          clinicId,
          qualification: member.qualification,
          registrationNumber: member.registrationNumber,
          specialization: validateSpecializationForOnboarding(
            member.specialization,
          ),
        },
      });

      // Audit log for staff creation
      await tx.auditLog.create({
        data: {
          userId: newUser.id,
          clinicId,
          action: 'USER_CREATED',
          entityType: 'User',
          entityId: newUser.id,
          metadata: {
            role: member.role,
            createdDuringOnboarding: true,
            ipAddress,
          },
        },
      });
    }
  }

  /**
   * Initialize default clinic settings
   */
  private async initializeClinicSettings(
    tx: PrismaTransaction,
    clinicId: string,
  ) {
    // Create reminder settings
    await tx.reminderSettings.create({
      data: {
        clinic: { connect: { id: clinicId } },
        enabled: false, // User can enable later
      },
    });
    this.logger.log(`Initialized defaults for clinic: ${clinicId}`);
  }

  // Helper methods
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
    return keyMap[step] || step.toLowerCase();
  }

  private getNextStep(currentStep: OnboardingStep): OnboardingStep {
    const stepOrder = [
      OnboardingStep.CLINIC_DETAILS,
      OnboardingStep.ADMIN_ACCOUNT,
      OnboardingStep.PLAN_SELECTION,
      OnboardingStep.PAYMENT_DETAILS,
      OnboardingStep.SLA_AGREEMENT,
      OnboardingStep.CONSENT_MANAGEMENT,
      OnboardingStep.STAFF_SETUP,
      OnboardingStep.COMPLETED,
    ];

    const currentIndex = stepOrder.indexOf(currentStep);
    return stepOrder[currentIndex + 1] || OnboardingStep.COMPLETED;
  }

  private validateOnboardingCompletion(data: CompleteOnboardingDto) {
    if (!data.clinicDetails) {
      throw new BadRequestException('Clinic details are required');
    }
    if (!data.adminAccount) {
      throw new BadRequestException('Admin account details are required');
    }
    if (!data.planSelection) {
      throw new BadRequestException('Plan selection is required');
    }
    if (!data.slaAgreement) {
      throw new BadRequestException('SLA agreement is required');
    }
    if (!data.consentManagement) {
      throw new BadRequestException(
        'Consent management configuration is required',
      );
    }
  }

  private validatePasswordStrength(password: string) {
    if (password.length < 8) {
      throw new BadRequestException(
        'Password must be at least 8 characters long',
      );
    }
    if (!/[A-Z]/.test(password)) {
      throw new BadRequestException(
        'Password must contain at least one uppercase letter',
      );
    }
    if (!/[a-z]/.test(password)) {
      throw new BadRequestException(
        'Password must contain at least one lowercase letter',
      );
    }
    if (!/[0-9]/.test(password)) {
      throw new BadRequestException(
        'Password must contain at least one number',
      );
    }
  }

  private getTierPricing(tier: string, cycle: string): number {
    const pricing: Record<string, Record<string, number>> = {
      CAPTURE: { MONTHLY: 0, YEARLY: 0 },
      CORE: { MONTHLY: 79900, YEARLY: 862900 }, // INR in paise
      PLUS: { MONTHLY: 199900, YEARLY: 2158900 },
      PRO: { MONTHLY: 399900, YEARLY: 4318900 },
      ENTERPRISE: { MONTHLY: 0, YEARLY: 0 }, // Custom pricing
    };

    return pricing[tier]?.[cycle] || 0;
  }

  private getTierLimits(tier: string) {
    const limits: Record<string, any> = {
      CAPTURE: {
        includedPatients: 50,
        includedAppointments: 100,
        includedStorageGB: 1,
        includedUsers: 1,
      },
      CORE: {
        includedPatients: 300,
        includedAppointments: 500,
        includedStorageGB: 5,
        includedUsers: 1,
      },
      PLUS: {
        includedPatients: 1000,
        includedAppointments: 2000,
        includedStorageGB: 20,
        includedUsers: 2,
      },
      PRO: {
        includedPatients: 5000,
        includedAppointments: 10000,
        includedStorageGB: 100,
        includedUsers: 10,
      },
      ENTERPRISE: {
        includedPatients: 999999,
        includedAppointments: 999999,
        includedStorageGB: 500,
        includedUsers: 50,
      },
    };

    return limits[tier] || limits.CAPTURE;
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
}
