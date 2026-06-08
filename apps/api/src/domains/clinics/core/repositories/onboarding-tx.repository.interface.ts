import type {
  BillingCycle,
  Clinic,
  ClinicTier,
  PlanMode,
  ClinicType,
  FacilityType,
  DayOfWeek,
  Prisma,
  Role,
  Subscription,
  SubscriptionStatus,
  User,
} from '@workspace/db';

export interface OnboardingClinicWriteData {
  name: string;
  email: string;
  phone: string;
  address: string;
  type: ClinicType;
  facilityType: FacilityType;
  website?: string;
  mrnPrefix: string;
  timezone: string;
  referralCode: string;
  settings: Prisma.InputJsonValue;
}

export interface OnboardingAdminUserWriteData {
  name: string;
  email: string;
  hashedPassword: string;
  phoneNumber?: string;
  role: Role;
  clinicId: string;
  onboardingCompletedAt: Date;
  qualification?: string;
  registrationNumber?: string;
  specialization?: User['specialization'];
}

export interface OnboardingSubscriptionWriteData {
  clinicId: string;
  plan: ClinicTier;
  billingCycle: BillingCycle;
  basePriceCents: number;
  currency: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  includedPatients: number;
  includedAppointments: number;
  includedStorageGB: number;
  includedUsers: number;
}

export interface OnboardingPaymentWriteData {
  clinicId: string;
  subscriptionId: string;
  amountCents: number;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  razorpaySignature?: string;
  cardLast4?: string;
  planTier: string;
  billingCycle: string;
  currency: string;
  paidAt: Date;
}

/**
 * Transaction-scoped repository for the onboarding saga. Every method takes the
 * outer `Prisma.TransactionClient` so the caller controls atomicity. Keeps the
 * `OnboardingWorkflowService` free of raw `tx.<model>.*` calls.
 */
export interface IOnboardingTxRepository {
  findClinicByEmail(
    tx: Prisma.TransactionClient,
    email: string,
  ): Promise<{ id: string } | null>;

  createClinic(
    tx: Prisma.TransactionClient,
    data: OnboardingClinicWriteData,
  ): Promise<Clinic>;

  createMrnSequence(
    tx: Prisma.TransactionClient,
    clinicId: string,
    prefix: string,
  ): Promise<void>;

  findUserByEmail(
    tx: Prisma.TransactionClient,
    email: string,
  ): Promise<User | null>;

  updateUserAsClinicAdmin(
    tx: Prisma.TransactionClient,
    userId: string,
    data: Omit<OnboardingAdminUserWriteData, 'email' | 'hashedPassword'>,
  ): Promise<User>;

  createAdminUser(
    tx: Prisma.TransactionClient,
    data: OnboardingAdminUserWriteData,
  ): Promise<User>;

  createSubscription(
    tx: Prisma.TransactionClient,
    data: OnboardingSubscriptionWriteData,
  ): Promise<Subscription>;

  createSubscriptionPayment(
    tx: Prisma.TransactionClient,
    data: OnboardingPaymentWriteData,
  ): Promise<void>;

  applyClinicTierAndTrial(
    tx: Prisma.TransactionClient,
    clinicId: string,
    tier: ClinicTier,
    status: SubscriptionStatus,
    trialEndsAt: Date | null,
    planMode?: PlanMode,
  ): Promise<void>;

  createReminderSettings(
    tx: Prisma.TransactionClient,
    clinicId: string,
  ): Promise<void>;

  // jscpd:ignore-start
  replaceClinicWeeklySchedules(
    tx: Prisma.TransactionClient,
    clinicId: string,
    rows: Array<{
      dayOfWeek: DayOfWeek;
      startTime: string;
      endTime: string;
      slotDuration: number;
      isActive: boolean;
    }>,
  ): Promise<void>;
  // jscpd:ignore-end
}

export const ONBOARDING_TX_REPOSITORY_TOKEN = Symbol('IOnboardingTxRepository');
