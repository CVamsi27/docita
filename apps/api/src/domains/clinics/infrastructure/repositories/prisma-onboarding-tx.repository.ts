import { Injectable, Logger } from '@nestjs/common';
import {
  Clinic,
  ClinicTier,
  PlanMode,
  DayOfWeek,
  Prisma,
  Subscription,
  SubscriptionStatus,
  User,
} from '@workspace/db';
import { DEFAULT_TAX_COUNTRY_CODE, DEFAULT_TAX_REGIME } from '@workspace/types';
import { isPrismaTableDoesNotExistForModel } from '@/shared/common/utils/prisma-missing-table';
import {
  IOnboardingTxRepository,
  OnboardingAdminUserWriteData,
  OnboardingClinicWriteData,
  OnboardingPaymentWriteData,
  OnboardingSubscriptionWriteData,
} from '@/domains/clinics/core/repositories/onboarding-tx.repository.interface';

@Injectable()
export class PrismaOnboardingTxRepository implements IOnboardingTxRepository {
  private readonly logger = new Logger(PrismaOnboardingTxRepository.name);

  findClinicByEmail(tx: Prisma.TransactionClient, email: string) {
    return tx.clinic.findFirst({
      where: { email },
      select: { id: true },
    });
  }

  createClinic(
    tx: Prisma.TransactionClient,
    data: OnboardingClinicWriteData,
  ): Promise<Clinic> {
    return tx.clinic.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        type: data.type,
        facilityType: data.facilityType,
        website: data.website,
        mrnPrefix: data.mrnPrefix,
        timezone: data.timezone,
        active: true,
        referralCode: data.referralCode,
        settings: data.settings,
      },
    });
  }

  async createMrnSequence(
    tx: Prisma.TransactionClient,
    clinicId: string,
    prefix: string,
  ): Promise<void> {
    await tx.mrnSequence.create({
      data: { clinicId, prefix, lastNumber: 0 },
    });
  }

  findUserByEmail(tx: Prisma.TransactionClient, email: string) {
    return tx.user.findUnique({ where: { email } });
  }

  updateUserAsClinicAdmin(
    tx: Prisma.TransactionClient,
    userId: string,
    data: Omit<OnboardingAdminUserWriteData, 'email' | 'hashedPassword'>,
  ): Promise<User> {
    return tx.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        role: data.role,
        clinicId: data.clinicId,
        onboardingStep: 'COMPLETED',
        onboardingCompletedAt: data.onboardingCompletedAt,
        phoneNumber: data.phoneNumber,
        qualification: data.qualification,
        registrationNumber: data.registrationNumber,
        specialization: data.specialization,
      },
    });
  }

  createAdminUser(
    tx: Prisma.TransactionClient,
    data: OnboardingAdminUserWriteData,
  ): Promise<User> {
    return tx.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: data.hashedPassword,
        phoneNumber: data.phoneNumber,
        role: data.role,
        clinicId: data.clinicId,
        onboardingStep: 'COMPLETED',
        onboardingCompletedAt: data.onboardingCompletedAt,
        qualification: data.qualification,
        registrationNumber: data.registrationNumber,
        specialization: data.specialization,
      },
    });
  }

  createSubscription(
    tx: Prisma.TransactionClient,
    data: OnboardingSubscriptionWriteData,
  ): Promise<Subscription> {
    return tx.subscription.create({
      data: {
        clinicId: data.clinicId,
        plan: data.plan,
        billingCycle: data.billingCycle,
        basePriceCents: data.basePriceCents,
        currency: data.currency,
        status: data.status,
        currentPeriodStart: data.currentPeriodStart,
        currentPeriodEnd: data.currentPeriodEnd,
        includedPatients: data.includedPatients,
        includedAppointments: data.includedAppointments,
        includedStorageGB: data.includedStorageGB,
        includedUsers: data.includedUsers,
      },
    });
  }

  async createSubscriptionPayment(
    tx: Prisma.TransactionClient,
    data: OnboardingPaymentWriteData,
  ): Promise<void> {
    await tx.subscriptionPayment.create({
      data: {
        clinicId: data.clinicId,
        subscriptionId: data.subscriptionId,
        amountCents: data.amountCents,
        status: 'paid',
        razorpayPaymentId: data.razorpayPaymentId,
        razorpayOrderId: data.razorpayOrderId,
        razorpaySignature: data.razorpaySignature,
        invoiceType: 'LEGACY',
        subtotalCents: data.amountCents,
        taxCents: 0,
        grandTotalCents: data.amountCents,
        taxSummary: {
          countryCode: DEFAULT_TAX_COUNTRY_CODE,
          regime: DEFAULT_TAX_REGIME,
          currency: data.currency,
          subtotal: data.amountCents / 100,
          discountTotal: 0,
          taxableAmount: 0,
          exemptAmount: data.amountCents / 100,
          taxTotal: 0,
          grandTotal: data.amountCents / 100,
          components: [],
          reverseCharge: false,
          documentTitle: 'Legacy Subscription Invoice',
        },
        description: data.cardLast4
          ? `${data.planTier} ${data.billingCycle} subscription (card ending ${data.cardLast4})`
          : `${data.planTier} ${data.billingCycle} subscription`,
        paidAt: data.paidAt,
      },
    });
  }

  async applyClinicTierAndTrial(
    tx: Prisma.TransactionClient,
    clinicId: string,
    tier: ClinicTier,
    status: SubscriptionStatus,
    trialEndsAt: Date | null,
    planMode?: PlanMode,
  ): Promise<void> {
    await tx.clinic.update({
      where: { id: clinicId },
      data: {
        tier,
        subscriptionStatus: status,
        trialEndsAt,
        ...(planMode ? { planMode } : {}),
      },
    });
  }

  async createReminderSettings(
    tx: Prisma.TransactionClient,
    clinicId: string,
  ): Promise<void> {
    await tx.reminderSettings.create({
      data: { clinic: { connect: { id: clinicId } }, enabled: false },
      // jscpd:ignore-start
    });
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
      // jscpd:ignore-end
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
