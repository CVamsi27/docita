import { Clinic, ClinicTier, SubscriptionStatus, Prisma } from '@workspace/db';

export interface ClinicFilter {
  tier?: ClinicTier;
  subscriptionStatus?: SubscriptionStatus;
  search?: string;
  isActive?: boolean;
}

export interface ClinicWithRelations extends Clinic {
  users?: Array<{ id: string; name: string; role: string; email: string }>;
  patients?: Array<{ id: string; firstName: string; lastName: string }>;
  appointments?: Array<{ id: string; startTime: Date; status: string }>;
}

export interface IClinicRepository {
  findById(id: string): Promise<Clinic | null>;

  findByIdWithRelations(
    id: string,
    include?: Prisma.ClinicInclude,
  ): Promise<ClinicWithRelations | null>;

  findAll(filter?: ClinicFilter): Promise<Clinic[]>;

  findPaginated(params: {
    page: number;
    limit: number;
    filter?: ClinicFilter;
  }): Promise<{
    data: Clinic[];
    total: number;
    page: number;
    totalPages: number;
  }>;

  create(data: Prisma.ClinicCreateInput): Promise<Clinic>;

  update(id: string, data: Prisma.ClinicUpdateInput): Promise<Clinic>;

  delete(id: string): Promise<void>;

  getSubscriptionStats(): Promise<{
    total: number;
    byTier: Record<ClinicTier, number>;
    byStatus: Record<SubscriptionStatus, number>;
    activeCount: number;
  }>;

  findExpiringSubscriptions(daysUntilExpiry: number): Promise<Clinic[]>;
}
