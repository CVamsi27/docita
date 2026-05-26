import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  SubscriptionStatus,
  User,
  Clinic,
  Subscription,
  Specialization as _Specialization,
  Role as _Role,
  Prisma,
  DayOfWeek,
} from '@workspace/db';
import * as bcrypt from 'bcrypt';
import {
  ClinicDetailsDto,
  AdminAccountDto,
  PlanSelectionDto,
  StaffSetupDto,
  ClinicTier,
} from '@/domains/clinics/application/dto/onboarding/create-clinic-onboarding.dto';
import { OnboardingValidationService } from './onboarding-validation.service';
import { toPrismaInputJsonValue } from '@/shared/common/json/to-prisma-input-json-value';
import { SUBSCRIPTION_TRIAL_DAYS } from '@workspace/types';
import { isFrontDeskTier } from '@workspace/types';

import {
  SUBSCRIPTION_TRIAL_DAYS,
  parseWorkspaceProfile,
  type WorkspaceProfile,
} from '@workspace/types';
import { isPrismaTableDoesNotExistForModel } from '@/common/utils/prisma-missing-table';
import {
  getDefaultClinicWeeklyHoursInput,
  computePeriodEnd,
} from './onboarding-step-engine';
import {
  generateUniqueReferralCodeInTx,
  createStaffMembersInTx,
  ensureFrontDeskScheduleDoctorInTx,
} from './onboarding-workflow-helpers';

interface OnboardingPaymentInput {
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  razorpaySignature?: string;
  cardLast4?: string;
  autoPay?: boolean;
  addons?: {
    whatsapp?: boolean;
    intelligence?: boolean;
  };
  whatsappBusinessNumber?: string;
  skipPayment?: boolean;
}

@Injectable()
export class OnboardingWorkflowService {
  private readonly logger = new Logger(OnboardingWorkflowService.name);

  constructor(
    private validation: OnboardingValidationService,
    @Inject(ONBOARDING_TX_REPOSITORY_TOKEN)
    private readonly repository: IOnboardingTxRepository,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async createClinic(
    tx: Prisma.TransactionClient,
    clinicData: ClinicDetailsDto,
    ipAddress?: string,
  ): Promise<Clinic> {
    const normalizedEmail = clinicData.email?.trim() ?? '';

    const existingClinic = normalizedEmail
      ? await tx.clinic.findFirst({ where: { email: normalizedEmail } })
      : null;

    if (existingClinic) {
      const { ConflictException } = await import('@nestjs/common');
      throw new ConflictException('Clinic with this email already exists');
    }

    const referralCode = await generateUniqueReferralCodeInTx(
      tx,
      clinicData.name,
    );

    const clinic = await tx.clinic.create({
      data: {
        name: clinicData.name,
        email: normalizedEmail,
        phone: clinicData.phone,
        address: clinicData.address,
        type: clinicData.type || 'GENERAL',
        website: clinicData.website,
        mrnPrefix: clinicData.mrnPrefix || 'CLI',
        timezone: clinicData.timezone || 'Asia/Kolkata',
        active: true,
        referralCode,
        settings: {
          dataResidency: clinicData.dataResidency || 'IN',
          operatingCountryCode: clinicData.countryCode || 'IN',
          facilityLabel: clinicData.facilityLabel || 'CLINIC',
          gstin: clinicData.gstin || undefined,
          privacyComplianceVersion: '1.0',
          onboardedAt: new Date().toISOString(),
          onboardedFromIP: ipAddress,
          workspaceProfile,
          mapsLocation: clinicData.mapsLocation ?? undefined,
          mapsLink: clinicData.mapsLink?.trim() || undefined,
          ...(clinicData.legalName && clinicData.legalName.trim().length > 0
            ? { taxSettings: { legalName: clinicData.legalName.trim() } }
            : {}),
        },
      },
    });

    await this.repository.createMrnSequence(
      tx,
      clinic.id,
      clinicData.mrnPrefix || 'CLI',
    );

    this.logger.log(`Created clinic: ${clinic.id}`);
    return clinic;
  }

  async createAdminUser(
    tx: Prisma.TransactionClient,
    adminData: AdminAccountDto,
    clinicId: string,
    _ipAddress?: string,
    planTier?: ClinicTier,
  ): Promise<User> {
    const { ConflictException, BadRequestException } =
      await import('@nestjs/common');
    const { Role } = await import('@workspace/db');

    const existingUser = await tx.user.findUnique({
      where: { email: adminData.email },
    });

    let resolvedRole =
      adminData.role ||
      (existingUser?.role === Role.ADMIN_DOCTOR
        ? Role.ADMIN_DOCTOR
        : Role.ADMIN);
    if (isFrontDeskTier(planTier) && resolvedRole === Role.ADMIN_DOCTOR) {
      resolvedRole = Role.ADMIN;
    }

    if (existingUser) {
      if (existingUser.clinicId) {
        throw new ConflictException('User with this email already exists');
      }

      const updatedUser = await this.repository.updateUserAsClinicAdmin(
        tx,
        existingUser.id,
        {
          name: adminData.name,
          role: resolvedRole,
          clinicId,
          phoneNumber: adminData.phoneNumber,
          qualification: adminData.qualification,
          registrationNumber: adminData.registrationNumber,
          specialization: this.validation.validateSpecialization(
            adminData.specialization,
          ),
        },
      );

      this.logger.log(
        `Linked existing user: ${updatedUser.id} (clinic owner) for clinic: ${clinicId}`,
      );
      return updatedUser;
    }

    if (!adminData.password) {
      throw new BadRequestException('Owner password is required');
    }

    const passwordValidation = this.validation.validatePasswordStrength(
      adminData.password,
    );
    if (!passwordValidation.valid) {
      throw new BadRequestException(passwordValidation.error);
    }

    const hashedPassword = await bcrypt.hash(adminData.password, 10);

    const user = await this.repository.createAdminUser(tx, {
      name: adminData.name,
      email: adminData.email,
      hashedPassword,
      phoneNumber: adminData.phoneNumber,
      role: resolvedRole,
      clinicId,
      qualification: adminData.qualification,
      registrationNumber: adminData.registrationNumber,
      specialization: this.validation.validateSpecialization(
        adminData.specialization,
      ),
    });

    this.logger.log(`Created admin user: ${user.id} for clinic: ${clinicId}`);
    return user;
  }

  async createSubscription(
    tx: Prisma.TransactionClient,
    clinicId: string,
    planData: PlanSelectionDto,
    paymentData?: OnboardingPaymentInput,
  ): Promise<Subscription> {
    const now = new Date();
    const periodEnd = computePeriodEnd({
      tier: planData.tier,
      billingCycle: planData.billingCycle,
      skipPayment: paymentData?.skipPayment,
      trialDays: SUBSCRIPTION_TRIAL_DAYS,
      now,
    });

    const priceCents = this.validation.getTierPricing(
      planData.tier,
      planData.billingCycle,
      planData.currency,
    );
    const tierLimits = this.validation.getTierLimits(planData.tier);

    const hasPayment =
      !!paymentData?.razorpayPaymentId ||
      (!!paymentData?.cardLast4 && paymentData?.skipPayment !== true);

    const subscription = await this.repository.createSubscription(tx, {
      clinicId,
      plan: planData.tier,
      billingCycle: planData.billingCycle,
      basePriceCents: priceCents,
      currency: planData.currency || 'INR',
      status: hasPayment
        ? SubscriptionStatus.ACTIVE
        : SubscriptionStatus.TRIALING,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      includedPatients: tierLimits.includedPatients,
      includedAppointments: tierLimits.includedAppointments,
      includedStorageGB: tierLimits.includedStorageGB,
      includedUsers: tierLimits.includedUsers,
    });

    if (hasPayment) {
      await tx.subscriptionPayment.create({
        data: {
          clinicId,
          subscriptionId: subscription.id,
          amountCents: priceCents,
          status: 'paid',
          razorpayPaymentId: paymentData!.razorpayPaymentId,
          razorpayOrderId: paymentData!.razorpayOrderId,
          razorpaySignature: paymentData!.razorpaySignature,
          invoiceType: 'LEGACY',
          subtotalCents: priceCents,
          taxCents: 0,
          grandTotalCents: priceCents,
          taxSummary: {
            countryCode: 'IN',
            regime: 'IN_GST',
            currency: planData.currency || 'INR',
            subtotal: priceCents / 100,
            discountTotal: 0,
            taxableAmount: 0,
            exemptAmount: priceCents / 100,
            taxTotal: 0,
            grandTotal: priceCents / 100,
            components: [],
            reverseCharge: false,
            documentTitle: 'Legacy Subscription Invoice',
          },
          description: paymentData!.cardLast4
            ? `${planData.tier} ${planData.billingCycle} subscription (card ending ${paymentData!.cardLast4})`
            : `${planData.tier} ${planData.billingCycle} subscription`,
          paidAt: now,
        },
      });
    }

    await this.repository.applyClinicTierAndTrial(
      tx,
      clinicId,
      planData.tier,
      hasPayment ? SubscriptionStatus.ACTIVE : SubscriptionStatus.TRIALING,
      hasPayment ? null : periodEnd,
    );

    this.logger.log(
      `Created subscription: ${subscription.id} for clinic: ${clinicId}`,
    );
    return subscription;
  }

  async createStaffMembers(
    tx: Prisma.TransactionClient,
    clinicId: string,
    staffData: StaffSetupDto,
    ipAddress?: string,
    planTier?: ClinicTier,
  ): Promise<number> {
    return createStaffMembersInTx(
      tx,
      clinicId,
      staffData,
      this.validation,
      ipAddress,
      planTier,
    );
  }

  async ensureFrontDeskScheduleDoctor(
    tx: Prisma.TransactionClient,
    clinicId: string,
  ): Promise<void> {
    await ensureFrontDeskScheduleDoctorInTx(tx, clinicId);
    this.logger.log(
      `Created schedule-anchor doctor for front-desk clinic ${clinicId}`,
    );
  }

  async initializeClinicSettings(
    tx: Prisma.TransactionClient,
    clinicId: string,
  ): Promise<void> {
    await tx.reminderSettings.create({
      data: { clinic: { connect: { id: clinicId } }, enabled: false },
    });
    this.logger.log(`Initialized clinic settings for: ${clinicId}`);
  }

  /**
   * Default Mon–Fri 09:00–17:00 when onboarding does not send explicit rows.
   */
  getDefaultClinicWeeklyHoursInput(): Array<{
    dayOfWeek: DayOfWeek;
    startTime: string;
    endTime: string;
    slotDuration: number;
    isActive: boolean;
  }> {
    return getDefaultClinicWeeklyHoursInput();
  }

  async replaceClinicWeeklySchedules(
    tx: Prisma.TransactionClient,
    clinicId: string,
    rows: Array<{
      dayOfWeek: DayOfWeek;
      startTime: string;
      endTime: string;
      slotDuration: number;
      isActive: boolean;
    }>,
  ): Promise<void> {
    try {
      await tx.clinicWeeklySchedule.deleteMany({ where: { clinicId } });
      if (rows.length === 0) return;
      await tx.clinicWeeklySchedule.createMany({
        data: rows.map((r) => ({
          clinicId,
          dayOfWeek: r.dayOfWeek,
          startTime: r.startTime,
          endTime: r.endTime,
          slotDuration: r.slotDuration,
          isActive: r.isActive,
        })),
      });
    } catch (error) {
      if (isPrismaTableDoesNotExistForModel(error, 'ClinicWeeklySchedule')) {
        this.logger.warn(
          'ClinicWeeklySchedule table is missing; skipping clinic weekly hours persistence. Apply @workspace/db migrations.',
        );
        return;
      }
      throw error;
    }
  }
}
