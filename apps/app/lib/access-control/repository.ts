/**
 * Subscription Repository
 * Single Responsibility: Data access and caching for subscription data
 * Repository Pattern implementation
 */

import { Feature, Tier } from "@workspace/types";
import type {
  IAccessContext,
  IAddOn,
  IFeatureOverride,
  ISubscription,
  ISubscriptionRepository,
} from "./interfaces";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface RawSubscriptionData {
  tier?: string;
  status?: string;
  features?: string[];
  startDate?: string | number;
  endDate?: string | number;
  billingCycle?: string;
}

interface RawOverrideData {
  feature: string;
  granted?: boolean;
  reason?: string;
  grantedBy?: string;
  expiresAt?: string | number;
  createdAt?: string | number;
}

export class SubscriptionRepository implements ISubscriptionRepository {
  private subscriptionCache = new Map<string, CacheEntry<ISubscription>>();
  private addOnsCache = new Map<string, CacheEntry<IAddOn[]>>();
  private overridesCache = new Map<string, CacheEntry<IFeatureOverride[]>>();
  private readonly cacheTTL: number;
  private readonly apiBaseUrl: string;
  private subscriptionListeners = new Map<
    string,
    Set<(subscription: ISubscription) => void>
  >();

  constructor(cacheTTL = 60000, apiBaseUrl = "/api") {
    this.cacheTTL = cacheTTL; // Default: 1 minute
    this.apiBaseUrl = apiBaseUrl;
  }

  async getContext(
    userId: string,
    clinicId?: string,
  ): Promise<Partial<IAccessContext>> {
    // Fetch all data in parallel
    const [subscription, addOns, overrides] = await Promise.all([
      this.getSubscription(userId, clinicId),
      this.getAddOns(userId, clinicId),
      this.getOverrides(userId),
    ]);

    return {
      userId,
      clinicId,
      subscription,
      addOns,
      overrides,
    };
  }

  async getSubscription(
    userId: string,
    clinicId?: string,
  ): Promise<ISubscription> {
    const cacheKey = this.getCacheKey(userId, clinicId);

    // Check cache first
    const cached = this.subscriptionCache.get(cacheKey);
    if (cached && this.isCacheValid(cached.timestamp)) {
      return cached.data;
    }

    // Fetch from API
    const url = clinicId
      ? `${this.apiBaseUrl}/clinics/${clinicId}/subscription`
      : `${this.apiBaseUrl}/users/${userId}/subscription`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch subscription: ${response.statusText}`);
    }

    const data = (await response.json()) as RawSubscriptionData;
    const subscription = this.normalizeSubscription(data);

    // Cache the result
    this.subscriptionCache.set(cacheKey, {
      data: subscription,
      timestamp: Date.now(),
    });

    // Notify listeners
    this.notifySubscriptionChange(userId, subscription);

    return subscription;
  }

  async getAddOns(userId: string, clinicId?: string): Promise<IAddOn[]> {
    const cacheKey = this.getCacheKey(userId, clinicId);

    // Check cache first
    const cached = this.addOnsCache.get(cacheKey);
    if (cached && this.isCacheValid(cached.timestamp)) {
      return cached.data;
    }

    // Fetch from API
    const url = clinicId
      ? `${this.apiBaseUrl}/clinics/${clinicId}/add-ons`
      : `${this.apiBaseUrl}/users/${userId}/add-ons`;

    const response = await fetch(url);

    if (!response.ok) {
      // If add-ons endpoint doesn't exist yet, return empty array
      if (response.status === 404) {
        return [];
      }
      throw new Error(`Failed to fetch add-ons: ${response.statusText}`);
    }

    const data = (await response.json()) as IAddOn[];
    const addOns = Array.isArray(data) ? data : [];

    // Cache the result
    this.addOnsCache.set(cacheKey, {
      data: addOns,
      timestamp: Date.now(),
    });

    return addOns;
  }

  async getOverrides(userId: string): Promise<IFeatureOverride[]> {
    const cacheKey = userId;

    // Check cache first
    const cached = this.overridesCache.get(cacheKey);
    if (cached && this.isCacheValid(cached.timestamp)) {
      return cached.data;
    }

    // Fetch from API
    const url = `${this.apiBaseUrl}/users/${userId}/overrides`;
    const response = await fetch(url);

    if (!response.ok) {
      // If overrides endpoint doesn't exist yet, return empty array
      if (response.status === 404) {
        return [];
      }
      throw new Error(`Failed to fetch overrides: ${response.statusText}`);
    }

    const data = (await response.json()) as RawOverrideData[];
    const overrides = Array.isArray(data)
      ? data.map(this.normalizeOverride)
      : [];

    // Cache the result
    this.overridesCache.set(cacheKey, {
      data: overrides,
      timestamp: Date.now(),
    });

    return overrides;
  }

  invalidateCache(userId: string, clinicId?: string): void {
    const cacheKey = this.getCacheKey(userId, clinicId);
    this.subscriptionCache.delete(cacheKey);
    this.addOnsCache.delete(cacheKey);
    this.overridesCache.delete(userId);
  }

  onSubscriptionChange(
    userId: string,
    callback: (subscription: ISubscription) => void,
  ): () => void {
    if (!this.subscriptionListeners.has(userId)) {
      this.subscriptionListeners.set(userId, new Set());
    }

    this.subscriptionListeners.get(userId)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.subscriptionListeners.get(userId)?.delete(callback);
      if (this.subscriptionListeners.get(userId)?.size === 0) {
        this.subscriptionListeners.delete(userId);
      }
    };
  }

  private getCacheKey(userId: string, clinicId?: string): string {
    return clinicId ? `${userId}:${clinicId}` : userId;
  }

  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.cacheTTL;
  }

  private normalizeSubscription(raw: RawSubscriptionData): ISubscription {
    // Validate Tier
    let tier: Tier = Tier.CAPTURE;
    if (raw.tier && Object.values(Tier).includes(raw.tier as unknown as Tier)) {
      tier = raw.tier as unknown as Tier;
    } else if (raw.tier && raw.tier in Tier) {
      // Handle string enum access if needed
      tier = Tier[raw.tier as keyof typeof Tier];
    }

    return {
      tier,
      status: this.isValidStatus(raw.status) ? raw.status : "active",
      features: Array.isArray(raw.features)
        ? raw.features
            .filter((f): f is string => typeof f === "string")
            .filter((f): f is Feature =>
              Object.values(Feature).includes(f as Feature),
            )
        : [],
      startDate: new Date(raw.startDate || Date.now()),
      endDate: raw.endDate ? new Date(raw.endDate) : undefined,
      billingCycle: raw.billingCycle === "yearly" ? "yearly" : "monthly",
    };
  }

  private normalizeOverride(raw: RawOverrideData): IFeatureOverride {
    // Ensure feature is valid - trust API or runtime check
    const feature = raw.feature as Feature;

    return {
      feature,
      granted: Boolean(raw.granted),
      reason: String(raw.reason || ""),
      grantedBy: String(raw.grantedBy || ""),
      expiresAt: raw.expiresAt ? new Date(raw.expiresAt) : undefined,
      createdAt: new Date(raw.createdAt || Date.now()),
    };
  }

  private isValidStatus(status?: string): status is ISubscription["status"] {
    return ["active", "past_due", "canceled", "trialing"].includes(
      status || "",
    );
  }

  private createDefaultSubscription(): ISubscription {
    return {
      tier: Tier.CAPTURE,
      status: "active",
      features: [],
      startDate: new Date(),
      billingCycle: "monthly",
    };
  }

  private notifySubscriptionChange(
    userId: string,
    subscription: ISubscription,
  ): void {
    const listeners = this.subscriptionListeners.get(userId);
    if (listeners) {
      listeners.forEach((callback) => callback(subscription));
    }
  }
}
