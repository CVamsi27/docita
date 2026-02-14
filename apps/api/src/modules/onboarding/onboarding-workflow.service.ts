import {
  Injectable,
  Logger,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionBillingService } from '../subscription/subscription-billing.service';
import { SubscriptionStatus } from '@workspace/db';
import * as bcrypt from 'bcrypt';
import type { OnboardingPaymentData } from '@workspace/types';
import type { PrismaTransaction } from '@workspace/types';
import {
  ClinicDetailsDto,
  AdminAccountDto,
  PlanSelectionDto,
  StaffSetupDto,
  BillingCycle,
} from './dto/create-clinic-onboarding.dto';
import { OnboardingValidationService } from './onboarding-validation.service';

@Injectable()
export class OnboardingWorkflowService {
  private readonly logger = new Logger(OnboardingWorkflowService.name);

  constructor(
    private prisma: PrismaService,
    private subscriptionBilling: SubscriptionBillingService,
    private validation: OnboardingValidationService,
  ) {}

  /**
   * Create clinic with DPDP compliance metadata
   */
  async createClinic(
    tx: PrismaTransaction,
    clinicData: ClinicDetailsDto,
    ipAddress?: string,
  ): Promise<any> {
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

    this.logger.log(`Created clinic: ${clinic.id}`);
    return clinic;
  }

  /**
   * Create admin user with encrypted password
   */
  async createAdminUser(
    tx: PrismaTransaction,
    adminData: AdminAccountDto,
    clinicId: string,
    ipAddress?: string,
  ): Promise<any> {
    // Check if user with email already exists
    const existingUser = await tx.user.findUnique({
      where: { email: adminData.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Validate password strength
    const passwordValidation = this.validation.validatePasswordStrength(
      adminData.password,
    );
    if (!passwordValidation.valid) {
      throw new BadRequestException(passwordValidation.error);
    }

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
        specialization: this.validation.validateSpecialization(
          adminData.specialization,
        ) as any,
      },
    });

    this.logger.log(`Created admin user: ${user.id} for clinic: ${clinicId}`);
    return user;
  }

  /**
   * Create subscription based on plan selection
   */
  async createSubscription(
    tx: PrismaTransaction,
    clinicId: string,
    planData: PlanSelectionDto,
    paymentData?: OnboardingPaymentData,
  ): Promise<any> {
    const now = new Date();
    const periodEnd =
      planData.billingCycle === BillingCycle.YEARLY
        ? new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
        : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Calculate pricing based on tier
    const priceCents = this.validation.getTierPricing(
      planData.tier,
      planData.billingCycle,
    );

    const tierLimits = this.validation.getTierLimits(planData.tier);

    const subscription = await tx.subscription.create({
      data: {
        clinicId,
        plan: planData.tier,
        billingCycle: planData.billingCycle,
        basePriceCents: priceCents,
        status: paymentData?.razorpayPaymentId
          ? SubscriptionStatus.ACTIVE
          : SubscriptionStatus.TRIALING,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        // Set appropriate usage limits based on tier
        includedPatients: tierLimits.includedPatients,
        includedAppointments: tierLimits.includedAppointments,
        includedStorageGB: tierLimits.includedStorageGB,
        includedUsers: tierLimits.includedUsers,
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

    this.logger.log(
      `Created subscription: ${subscription.id} for clinic: ${clinicId}`,
    );
    return subscription;
  }

  /**
   * Create staff members
   */
  async createStaffMembers(
    tx: PrismaTransaction,
    clinicId: string,
    staffData: StaffSetupDto,
    ipAddress?: string,
  ): Promise<number> {
    if (!staffData.staffMembers || staffData.staffMembers.length === 0) {
      return 0;
    }

    let createdCount = 0;

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

      // Validate password strength
      const passwordValidation = this.validation.validatePasswordStrength(
        member.password,
      );
      if (!passwordValidation.valid) {
        this.logger.warn(
          `Invalid password for staff member ${member.email}: ${passwordValidation.error}`,
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
          specialization: this.validation.validateSpecialization(
            member.specialization,
          ) as any,
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

      createdCount++;
      this.logger.log(`Created staff member: ${newUser.id} (${member.email})`);
    }

    return createdCount;
  }

  /**
   * Initialize default clinic settings
   */
  async initializeClinicSettings(
    tx: PrismaTransaction,
    clinicId: string,
  ): Promise<void> {
    // Create reminder settings
    await tx.reminderSettings.create({
      data: {
        clinic: { connect: { id: clinicId } },
        enabled: false, // User can enable later
      },
    });

    this.logger.log(`Initialized clinic settings for: ${clinicId}`);
  }
}
