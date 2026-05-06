import {
  Injectable,
  Logger,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  SubscriptionStatus,
  User,
  Clinic,
  Subscription,
  Specialization as _Specialization,
  Role,
  Prisma,
  DayOfWeek,
} from '@workspace/db';
import * as bcrypt from 'bcrypt';
import {
  ClinicDetailsDto,
  AdminAccountDto,
  PlanSelectionDto,
  StaffSetupDto,
  BillingCycle,
  ClinicTier,
} from '@/domains/clinics/application/dto/onboarding/create-clinic-onboarding.dto';
import { OnboardingValidationService } from './onboarding-validation.service';
import {
  SUBSCRIPTION_TRIAL_DAYS,
  parseWorkspaceProfile,
  type WorkspaceProfile,
} from '@workspace/types';
import { randomBytes } from 'crypto';
import { isPrismaTableDoesNotExistForModel } from '@/common/utils/prisma-missing-table';

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

function toStaffRole(
  role: 'DOCTOR' | 'NURSE' | 'RECEPTIONIST' | 'ADMIN' | 'ADMIN_DOCTOR',
): Role {
  if (role === 'DOCTOR') return Role.DOCTOR;
  if (role === 'NURSE') return Role.NURSE;
  if (role === 'ADMIN') return Role.ADMIN;
  if (role === 'ADMIN_DOCTOR') return Role.ADMIN_DOCTOR;
  return Role.RECEPTIONIST;
}

@Injectable()
export class OnboardingWorkflowService {
  private readonly logger = new Logger(OnboardingWorkflowService.name);

  constructor(
    private prisma: PrismaService,
    private validation: OnboardingValidationService,
  ) {}

  private generateReferralCode(clinicName: string): string {
    const prefix = clinicName
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase()
      .slice(0, 3)
      .padEnd(3, 'X');
    const suffix = Math.random().toString(36).toUpperCase().slice(2, 6);
    return `${prefix}-${suffix}`;
  }

  private async generateUniqueReferralCode(
    tx: Prisma.TransactionClient,
    clinicName: string,
  ): Promise<string> {
    let attempts = 0;
    let referralCode = this.generateReferralCode(clinicName);

    while (attempts < 8) {
      const existing = await tx.clinic.findFirst({
        where: { referralCode },
        select: { id: true },
      });

      if (!existing) {
        return referralCode;
      }

      attempts += 1;
      referralCode = this.generateReferralCode(clinicName);
    }

    throw new BadRequestException('Unable to generate a unique clinic code');
  }

  async createClinic(
    tx: Prisma.TransactionClient,
    clinicData: ClinicDetailsDto,
    ipAddress?: string,
    workspaceProfileInput?: WorkspaceProfile | null,
  ): Promise<Clinic> {
    const workspaceProfile = parseWorkspaceProfile(workspaceProfileInput);
    const normalizedEmail = clinicData.email?.trim() ?? '';

    const existingClinic = normalizedEmail
      ? await tx.clinic.findFirst({
          where: { email: normalizedEmail },
        })
      : null;

    if (existingClinic) {
      throw new ConflictException('Clinic with this email already exists');
    }

    const referralCode = await this.generateUniqueReferralCode(
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
        },
      },
    });

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

  async createAdminUser(
    tx: Prisma.TransactionClient,
    adminData: AdminAccountDto,
    clinicId: string,
    _ipAddress?: string,
    planTier?: ClinicTier,
  ): Promise<User> {
    const existingUser = await tx.user.findUnique({
      where: { email: adminData.email },
    });

    let resolvedRole =
      adminData.role ||
      (existingUser?.role === Role.ADMIN_DOCTOR
        ? Role.ADMIN_DOCTOR
        : Role.ADMIN);
    if (
      planTier === ClinicTier.FRONT_DESK &&
      resolvedRole === Role.ADMIN_DOCTOR
    ) {
      resolvedRole = Role.ADMIN;
    }

    if (existingUser) {
      if (existingUser.clinicId) {
        throw new ConflictException('User with this email already exists');
      }

      const updatedUser = await tx.user.update({
        where: { id: existingUser.id },
        data: {
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
      });

      this.logger.log(
        `Linked existing user: ${updatedUser.id} as owner for clinic: ${clinicId}`,
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

    const user = await tx.user.create({
      data: {
        name: adminData.name,
        email: adminData.email,
        password: hashedPassword,
        phoneNumber: adminData.phoneNumber,
        role: resolvedRole,
        clinicId,
        qualification: adminData.qualification,
        registrationNumber: adminData.registrationNumber,
        specialization: this.validation.validateSpecialization(
          adminData.specialization,
        ),
      },
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
    const trialMs = SUBSCRIPTION_TRIAL_DAYS * 24 * 60 * 60 * 1000;
    const isTrialWithoutPayment =
      planData.tier === ClinicTier.ESSENTIAL &&
      paymentData?.skipPayment === true;
    const periodEnd = isTrialWithoutPayment
      ? planData.billingCycle === BillingCycle.YEARLY
        ? new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
        : new Date(now.getTime() + trialMs)
      : planData.billingCycle === BillingCycle.YEARLY
        ? new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
        : new Date(now.getTime() + trialMs);

    const priceCents = this.validation.getTierPricing(
      planData.tier,
      planData.billingCycle,
      planData.currency,
    );

    const tierLimits = this.validation.getTierLimits(planData.tier);

    const hasPayment =
      !!paymentData?.razorpayPaymentId ||
      (!!paymentData?.cardLast4 && paymentData?.skipPayment !== true);

    const subscription = await tx.subscription.create({
      data: {
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
      },
    });

    if (hasPayment) {
      await tx.subscriptionPayment.create({
        data: {
          clinicId,
          subscriptionId: subscription.id,
          amountCents: priceCents,
          status: 'paid',
          razorpayPaymentId: paymentData.razorpayPaymentId,
          razorpayOrderId: paymentData.razorpayOrderId,
          razorpaySignature: paymentData.razorpaySignature,
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
          description: paymentData.cardLast4
            ? `${planData.tier} ${planData.billingCycle} subscription (card ending ${paymentData.cardLast4})`
            : `${planData.tier} ${planData.billingCycle} subscription`,
          paidAt: now,
        },
      });
    }

    await tx.clinic.update({
      where: { id: clinicId },
      data: {
        tier: planData.tier,
        subscriptionStatus: hasPayment
          ? SubscriptionStatus.ACTIVE
          : SubscriptionStatus.TRIALING,
        trialEndsAt: hasPayment ? null : periodEnd,
      },
    });

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
    if (!staffData.staffMembers?.length) return 0;

    let count = 0;
    for (const member of staffData.staffMembers) {
      const existing = await tx.user.findUnique({
        where: { email: member.email },
      });

      if (existing) continue;

      const passwordValidation = this.validation.validatePasswordStrength(
        member.password,
      );
      if (!passwordValidation.valid) continue;

      const hashedPassword = await bcrypt.hash(member.password, 10);
      const prismaRole = toStaffRole(member.role);
      const anchorDoctorOnFrontDeskTier =
        planTier === ClinicTier.FRONT_DESK && prismaRole === Role.DOCTOR;

      const newUser = await tx.user.create({
        data: {
          name: member.name,
          email: member.email,
          password: hashedPassword,
          phoneNumber: member.phoneNumber,
          role: prismaRole,
          clinicId,
          qualification: member.qualification,
          registrationNumber: member.registrationNumber,
          specialization: this.validation.validateSpecialization(
            member.specialization,
          ),
          ...(anchorDoctorOnFrontDeskTier ? { appLoginDisabled: true } : {}),
        },
      });

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

      count++;
    }

    return count;
  }

  async ensureFrontDeskScheduleDoctor(
    tx: Prisma.TransactionClient,
    clinicId: string,
  ): Promise<void> {
    const doctorCount = await tx.user.count({
      where: { clinicId, role: Role.DOCTOR },
    });
    if (doctorCount > 0) {
      return;
    }

    const token = randomBytes(12).toString('hex');
    const email = `schedule-${clinicId}-${token}@placeholders.docita.invalid`;
    const hashedPassword = await bcrypt.hash(
      randomBytes(32).toString('hex'),
      10,
    );

    const user = await tx.user.create({
      data: {
        name: 'Clinic schedule',
        email,
        password: hashedPassword,
        role: Role.DOCTOR,
        clinicId,
        appLoginDisabled: true,
      },
    });

    await tx.doctorClinic.create({
      data: { doctorId: user.id, clinicId },
    });

    this.logger.log(
      `Created schedule-anchor doctor for front-desk clinic ${clinicId}`,
    );
  }

  async initializeClinicSettings(
    tx: Prisma.TransactionClient,
    clinicId: string,
  ): Promise<void> {
    await tx.reminderSettings.create({
      data: {
        clinic: { connect: { id: clinicId } },
        enabled: false,
      },
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
    const weekend = new Set<DayOfWeek>([DayOfWeek.SATURDAY, DayOfWeek.SUNDAY]);
    const allDays: DayOfWeek[] = [
      DayOfWeek.SUNDAY,
      DayOfWeek.MONDAY,
      DayOfWeek.TUESDAY,
      DayOfWeek.WEDNESDAY,
      DayOfWeek.THURSDAY,
      DayOfWeek.FRIDAY,
      DayOfWeek.SATURDAY,
    ];
    return allDays.map((dayOfWeek) => ({
      dayOfWeek,
      startTime: '09:00',
      endTime: '17:00',
      slotDuration: 30,
      isActive: !weekend.has(dayOfWeek),
    }));
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
      if (rows.length === 0) {
        return;
      }
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
