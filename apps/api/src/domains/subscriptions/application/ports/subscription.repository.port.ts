/**
 * Subscription Repository Port
 * Abstract interface for subscription persistence
 * 
 * Allows swapping between Prisma, in-memory, or other implementations
 */

import { Subscription } from '../../core/entities';

export interface ISubscriptionRepository {
  /**
   * Save (create) a new subscription
   */
  save(subscription: Subscription): Promise<void>;

  /**
   * Find subscription by ID
   */
  findById(id: string): Promise<Subscription | null>;

  /**
   * Find subscription by clinic ID (unique per clinic)
   */
  findByClinicId(clinicId: string): Promise<Subscription | null>;

  /**
   * Find subscriptions by status
   */
  findByStatus(status: string): Promise<Subscription[]>;

  /**
   * Find subscriptions approaching renewal
   */
  findApproachingRenewal(daysThreshold: number): Promise<Subscription[]>;

  /**
   * Update subscription
   */
  update(subscription: Subscription): Promise<void>;

  /**
   * Delete subscription
   */
  delete(id: string): Promise<void>;
}

export const SUBSCRIPTION_REPOSITORY_TOKEN = 'ISubscriptionRepository';
