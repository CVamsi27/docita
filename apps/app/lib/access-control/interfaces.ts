/**
 * Core interfaces for the feature access control system
 * Following SOLID principles for loose coupling and extensibility
 */

import {
  type ClinicType,
  Feature,
  Tier,
  type UserRole,
} from "@workspace/types";
import type { Permission } from "@/lib/permissions";

/**
 * Enum for add-on types
 */
export enum AddOnType {
  WHATSAPP = "WHATSAPP",
  INTELLIGENCE = "INTELLIGENCE",
}

/**
 * Subscription interface
 * Represents the user's current subscription tier and status
 */
export interface ISubscription {
  tier: Tier;
  status: "active" | "past_due" | "canceled" | "trialing";
  features: Feature[];
  startDate: Date;
  endDate?: Date;
  billingCycle: "monthly" | "yearly" | "custom";
}

/**
 * Add-on interface
 * Represents purchased add-ons with usage tracking
 */
export interface IAddOn {
  type: AddOnType;
  status: "active" | "inactive" | "suspended";
  baseQuota: number;
  usedQuota: number;
  overageRate: number;
  billingCycle: "monthly" | "yearly";
  expiresAt?: Date;
}

/**
 * Feature override interface
 * For admin grants, trials, beta features, etc.
 */
export interface IFeatureOverride {
  feature: Feature | string;
  granted: boolean;
  reason: string;
  grantedBy?: string;
  expiresAt?: Date;
  createdAt: Date;
}

/**
 * Access context
 * Contains all information needed to make access control decisions
 */
export interface IAccessContext {
  feature: Feature | string;
  userId: string;
  clinicId?: string;
  subscription: ISubscription;
  addOns: IAddOn[];
  overrides?: IFeatureOverride[];
  metadata?: Record<string, unknown>;

  // Role-based access control
  userRole: UserRole;
  requiredPermission?: Permission;

  // Clinic type-based access control
  clinicType?: ClinicType;
}

/**
 * Upgrade option interface
 * Provides upgrade paths when access is denied
 */
export interface IUpgradeOption {
  type: "upgrade_tier" | "purchase_addon";
  target: string; // Tier name or AddOn type
  currentPrice: number;
  newPrice: number;
  currency: string;
  savings?: number;
  description: string;
}

/**
 * Access decision interface
 * Result of an access control evaluation
 */
export interface IAccessDecision {
  granted: boolean;
  reason: string;
  ruleName: string;
  denialType?:
    | "tier_insufficient"
    | "addon_required"
    | "role_insufficient"
    | "subscription_inactive"
    | "clinic_type_unsupported"; // NEW: Clinic type doesn't support feature
  upgradeOptions?: IUpgradeOption[];
  metadata?: {
    requiredTier?: Tier;
    requiredAddOn?: AddOnType;
    expiresAt?: Date;
    currentRole?: UserRole;
    requiredRole?: UserRole;
    unsupportedForClinicType?: ClinicType; // NEW: Which clinic type denied access
  };
}

/**
 * Base interface for access control rules
 * Each rule implements a specific access control strategy
 * Interface Segregation Principle: Minimal, focused interface
 */
export interface IAccessRule {
  /**
   * Evaluate if access should be granted based on the context
   */
  canAccess(context: IAccessContext): boolean;

  /**
   * Get the name of this rule for debugging/logging
   */
  getRuleName(): string;

  /**
   * Optional: Priority of this rule (higher = evaluated first)
   * Default: 0
   */
  getPriority?(): number;
}

/**
 * Access control service interface
 * High-level service for access control decisions
 * Dependency Inversion Principle: Depend on abstraction, not implementation
 */
export interface IAccessControlService {
  /**
   * Check access with async subscription refresh
   */
  canAccess(context: IAccessContext): Promise<IAccessDecision>;

  /**
   * Check access synchronously (uses cached data)
   */
  canAccessSync(context: IAccessContext): IAccessDecision;

  /**
   * Get detailed reason for access denial
   */
  getReason(context: IAccessContext): string;

  /**
   * Get upgrade options for a denied feature
   */
  getUpgradeOptions(context: IAccessContext): IUpgradeOption[];
}

/**
 * Subscription repository interface
 * Single Responsibility: Data access and caching
 */
export interface ISubscriptionRepository {
  /**
   * Get complete access context for a user
   */
  getContext(
    userId: string,
    clinicId?: string,
  ): Promise<Partial<IAccessContext>>;

  /**
   * Get subscription data
   */
  getSubscription(userId: string, clinicId?: string): Promise<ISubscription>;

  /**
   * Get active add-ons
   */
  getAddOns(userId: string, clinicId?: string): Promise<IAddOn[]>;

  /**
   * Get feature overrides
   */
  getOverrides(userId: string): Promise<IFeatureOverride[]>;

  /**
   * Invalidate cache for a user
   */
  invalidateCache(userId: string): void;

  /**
   * Subscribe to subscription changes (Observer Pattern)
   */
  onSubscriptionChange(
    userId: string,
    callback: (subscription: ISubscription) => void,
  ): () => void;
}

/**
 * Access control configuration
 */
export interface IAccessControlConfig {
  enableLogging?: boolean;
  enableAnalytics?: boolean;
  cacheTTL?: number;
  apiBaseUrl?: string;
}

/**
 * Type guards
 */
export function isFeatureEnum(feature: Feature | string): feature is Feature {
  return typeof feature === "string" && feature in Feature;
}

export function isActiveSubscription(subscription: ISubscription): boolean {
  return subscription.status === "active" || subscription.status === "trialing";
}

export function isActiveAddOn(addOn: IAddOn): boolean {
  return (
    addOn.status === "active" &&
    (!addOn.expiresAt || addOn.expiresAt > new Date())
  );
}

export function hasQuotaRemaining(addOn: IAddOn): boolean {
  return addOn.usedQuota < addOn.baseQuota;
}
