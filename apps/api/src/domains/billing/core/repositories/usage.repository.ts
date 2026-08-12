import { Prisma, UsageType } from '@workspace/db';

export const USAGE_REPOSITORY_TOKEN = Symbol('IUsageRepository');

export interface SubscriptionUsageSnapshot {
  plan: string;
  includedAppointments: number;
  includedUsers: number;
  currency: string;
}

export interface ClinicTierSnapshot {
  tier: string;
  planMode: string;
}

export interface ActiveAddOnSnapshot {
  addOnType: string;
  addOn: { includedQuotaByTier: unknown };
}

export interface UpsertUsageRecordParams {
  clinicId: string;
  type: UsageType;
  periodStart: Date;
  periodEnd: Date;
  quantity: number;
  includedQuota: number;
  overageUnits: number;
}

export interface CreateUsageEventParams {
  clinicId: string;
  type: UsageType;
  quantity: number;
  entityType?: string | null;
  entityId?: string | null;
  eventKey?: string | null;
  metadata?: Prisma.InputJsonValue;
}

export interface IUsageRepository {
  /** RLS bypass for cross-clinic rollups; runs the callback unrestricted. */
  runUnrestricted<T>(fn: () => Promise<T>): Promise<T>;

  findActiveSubscriptionClinicIds(): Promise<string[]>;
  findSubscriptionPlan(clinicId: string): Promise<string | null>;
  findSubscriptionSnapshot(
    clinicId: string,
  ): Promise<SubscriptionUsageSnapshot | null>;
  findClinicTier(clinicId: string): Promise<ClinicTierSnapshot | null>;
  findActiveAddOns(clinicId: string): Promise<ActiveAddOnSnapshot[]>;
  sumUsage(
    clinicId: string,
    type: UsageType,
    start: Date,
    end: Date,
  ): Promise<number>;
  maxUsage(
    clinicId: string,
    type: UsageType,
    start: Date,
    end: Date,
  ): Promise<number | null>;
  findMaxUsageRecord(
    clinicId: string,
    type: UsageType,
    start: Date,
    end: Date,
  ): Promise<number | null>;
  countCompletedAppointments(
    clinicId: string,
    start: Date,
    end: Date,
  ): Promise<number>;
  countActiveUsers(
    clinicId: string,
    planMode: string | null | undefined,
  ): Promise<number>;
  upsertUsageRecord(params: UpsertUsageRecordParams): Promise<void>;
  /** Returns true when the event was created, false when a duplicate was ignored. */
  createUsageEvent(params: CreateUsageEventParams): Promise<boolean>;
}
