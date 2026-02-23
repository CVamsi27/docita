/**
 * Clinic Repository Interface
 *
 * SOLID PRINCIPLES:
 * - Dependency Inversion: Services depend on abstraction, not concrete implementation
 * - Interface Segregation: Focused interface for clinic data access
 * - Single Responsibility: Only handles clinic data persistence
 *
 * BENEFITS:
 * - Easier testing (can mock repository)
 * - Flexibility to change ORM without affecting business logic
 * - Clear separation between domain and persistence layers
 */

import { Clinic, ClinicTier, SubscriptionStatus, Prisma } from '@workspace/db';

export interface ClinicFilter {
  tier?: ClinicTier;
  subscriptionStatus?: SubscriptionStatus;
  search?: string; // Search by name
  isActive?: boolean;
}

export interface ClinicWithRelations extends Clinic {
  users?: Array<{ id: string; name: string; role: string; email: string }>;
  patients?: Array<{ id: string; firstName: string; lastName: string }>;
  appointments?: Array<{ id: string; startTime: Date; status: string }>;
}

export interface IClinicRepository {
  /**
   * Find clinic by ID
   */
  findById(id: string): Promise<Clinic | null>;

  /**
   * Find clinic by ID with related data
   */
  findByIdWithRelations(
    id: string,
    include?: Prisma.ClinicInclude,
  ): Promise<ClinicWithRelations | null>;

  /**
   * Find all clinics by filter
   */
  findAll(filter?: ClinicFilter): Promise<Clinic[]>;

  /**
   * Find paginated clinics
   */
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

  /**
   * Create new clinic
   */
  create(data: Prisma.ClinicCreateInput): Promise<Clinic>;

  /**
   * Update clinic
   */
  update(id: string, data: Prisma.ClinicUpdateInput): Promise<Clinic>;

  /**
   * Delete clinic (soft delete)
   */
  delete(id: string): Promise<void>;

  /**
   * Get subscription statistics
   */
  getSubscriptionStats(): Promise<{
    total: number;
    byTier: Record<ClinicTier, number>;
    byStatus: Record<SubscriptionStatus, number>;
    activeCount: number;
  }>;

  /**
   * Get clinics with expiring subscriptions
   */
  findExpiringSubscriptions(daysUntilExpiry: number): Promise<Clinic[]>;
}
