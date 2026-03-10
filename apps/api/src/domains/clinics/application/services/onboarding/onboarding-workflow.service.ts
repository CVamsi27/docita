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

function toStaffRole(role: 'DOCTOR' | 'RECEPTIONIST' | 'ADMIN_DOCTOR'): Role {
  if (role === 'DOCTOR') return Role.DOCTOR;
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

  async createClinic(
    tx: Prisma.TransactionClient,
    clinicData: ClinicDetailsDto,
    ipAddress?: string,
  ): Promise<Clinic> {
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
        settings: {
          dataResidency: clinicData.dataResidency || 'IN',
          privacyComplianceVersion: '1.0',
          onboardedAt: new Date().toISOString(),
          onboardedFromIP: ipAddress,
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
  ): Promise<User> {
    const existingUser = await tx.user.findUnique({
      where: { email: adminData.email },
    });

    const resolvedRole =
      adminData.role ||
      (existingUser?.role === Role.ADMIN_DOCTOR
        ? Role.ADMIN_DOCTOR
        : Role.ADMIN);

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
    const isCoreTrial =
      planData.tier === ClinicTier.CORE && paymentData?.skipPayment === true;
    const periodEnd = isCoreTrial
      ? new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
      : planData.billingCycle === BillingCycle.YEARLY
        ? new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
        : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const priceCents = this.validation.getTierPricing(
      planData.tier,
      planData.billingCycle,
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
          description: paymentData.cardLast4
            ? `${planData.tier} ${planData.billingCycle} subscription (card ending ${paymentData.cardLast4})`
            : `${planData.tier} ${planData.billingCycle} subscription`,
          paidAt: now,
        },
      });
    }

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

      const newUser = await tx.user.create({
        data: {
          name: member.name,
          email: member.email,
          password: hashedPassword,
          phoneNumber: member.phoneNumber,
          role: toStaffRole(member.role),
          clinicId,
          qualification: member.qualification,
          registrationNumber: member.registrationNumber,
          specialization: this.validation.validateSpecialization(
            member.specialization,
          ),
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
}
