

import {
  type ClinicType,
  Feature,
  Tier,
  type UserRole,
} from "@workspace/types";
import type { Permission } from "@/lib/auth/permissions";

export enum AddOnType {
  WHATSAPP = "WHATSAPP",
  INTELLIGENCE = "INTELLIGENCE",
}

export interface ISubscription {
  tier: Tier;
  status: "active" | "past_due" | "canceled" | "trialing";
  features: Feature[];
  startDate: Date;
  endDate?: Date;
  billingCycle: "monthly" | "yearly" | "custom";
}

export interface IAddOn {
  type: AddOnType;
  status: "active" | "inactive" | "suspended";
  baseQuota: number;
  usedQuota: number;
  overageRate: number;
  billingCycle: "monthly" | "yearly";
  expiresAt?: Date;
}

export interface IFeatureOverride {
  feature: Feature | string;
  granted: boolean;
  reason: string;
  grantedBy?: string;
  expiresAt?: Date;
  createdAt: Date;
}

export interface IAccessContext {
  feature: Feature | string;
  userId: string;
  clinicId?: string;
  subscription: ISubscription;
  addOns: IAddOn[];
  overrides?: IFeatureOverride[];
  metadata?: Record<string, unknown>;

  userRole: UserRole;
  requiredPermission?: Permission;

  clinicType?: ClinicType;
}

export interface IUpgradeOption {
  type: "upgrade_tier" | "purchase_addon";
  target: string; 
  currentPrice: number;
  newPrice: number;
  currency: string;
  savings?: number;
  description: string;
}

export interface IAccessDecision {
  granted: boolean;
  reason: string;
  ruleName: string;
  denialType?:
    | "tier_insufficient"
    | "addon_required"
    | "role_insufficient"
    | "subscription_inactive"
    | "clinic_type_unsupported"; 
  upgradeOptions?: IUpgradeOption[];
  metadata?: {
    requiredTier?: Tier;
    requiredAddOn?: AddOnType;
    expiresAt?: Date;
    currentRole?: UserRole;
    requiredRole?: UserRole;
    unsupportedForClinicType?: ClinicType; 
  };
}

export interface IAccessRule {
  
  canAccess(context: IAccessContext): boolean;

  
  getRuleName(): string;

  
  getPriority?(): number;
}

export interface IAccessControlService {
  
  canAccess(context: IAccessContext): Promise<IAccessDecision>;

  
  canAccessSync(context: IAccessContext): IAccessDecision;

  
  getReason(context: IAccessContext): string;

  
  getUpgradeOptions(context: IAccessContext): IUpgradeOption[];
}

export interface ISubscriptionRepository {
  
  getContext(
    userId: string,
    clinicId?: string,
  ): Promise<Partial<IAccessContext>>;

  
  getSubscription(userId: string, clinicId?: string): Promise<ISubscription>;

  
  getAddOns(userId: string, clinicId?: string): Promise<IAddOn[]>;

  
  getOverrides(userId: string): Promise<IFeatureOverride[]>;

  
  invalidateCache(userId: string): void;

  
  onSubscriptionChange(
    userId: string,
    callback: (subscription: ISubscription) => void,
  ): () => void;
}

export interface IAccessControlConfig {
  enableLogging?: boolean;
  enableAnalytics?: boolean;
  cacheTTL?: number;
  apiBaseUrl?: string;
}

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
