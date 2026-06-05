import { isRecord } from "@workspace/utils";
import { browserRequest } from "@/lib/auth/browser-request";
import {
  type IAccessContext,
  type IAddOn,
  type IFeatureOverride,
  type ISubscription,
  type ISubscriptionRepository,
} from "./interfaces";
import {
  parseAddOnList,
  normalizeSubscription,
  normalizeOverride,
} from "./repository-helpers";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
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
    this.cacheTTL = cacheTTL;
    this.apiBaseUrl = apiBaseUrl;
  }

  async getContext(
    userId: string,
    clinicId?: string,
  ): Promise<Partial<IAccessContext>> {
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

    const cached = this.subscriptionCache.get(cacheKey);
    if (cached && this.isCacheValid(cached.timestamp)) {
      return cached.data;
    }

    const url = clinicId
      ? `${this.apiBaseUrl}/clinics/${clinicId}/subscription`
      : `${this.apiBaseUrl}/users/${userId}/subscription`;

    const response = await browserRequest(url);

    if (!response.ok) {
      throw new Error(
        "We could not load your subscription details. Please try again.",
      );
    }

    const data: unknown = await response.json();
    const subscription = normalizeSubscription(data);

    this.subscriptionCache.set(cacheKey, {
      data: subscription,
      timestamp: Date.now(),
    });

    this.notifySubscriptionChange(userId, subscription);

    return subscription;
  }

  async getAddOns(userId: string, clinicId?: string): Promise<IAddOn[]> {
    const cacheKey = this.getCacheKey(userId, clinicId);

    const cached = this.addOnsCache.get(cacheKey);
    if (cached && this.isCacheValid(cached.timestamp)) {
      return cached.data;
    }

    const url = clinicId
      ? `${this.apiBaseUrl}/clinics/${clinicId}/add-ons`
      : `${this.apiBaseUrl}/users/${userId}/add-ons`;

    const response = await browserRequest(url);

    if (!response.ok) {
      if (response.status === 404) {
        return [];
      }
      throw new Error(
        "We could not load your subscription details. Please try again.",
      );
    }

    const data: unknown = await response.json();
    const addOns = parseAddOnList(data);

    this.addOnsCache.set(cacheKey, {
      data: addOns,
      timestamp: Date.now(),
    });

    return addOns;
  }

  async getOverrides(userId: string): Promise<IFeatureOverride[]> {
    const cacheKey = userId;

    const cached = this.overridesCache.get(cacheKey);
    if (cached && this.isCacheValid(cached.timestamp)) {
      return cached.data;
    }

    const url = `${this.apiBaseUrl}/users/${userId}/overrides`;
    const response = await browserRequest(url);

    if (!response.ok) {
      if (response.status === 404) {
        return [];
      }
      throw new Error(
        "We could not load your subscription details. Please try again.",
      );
    }

    const data: unknown = await response.json();
    const overrides = Array.isArray(data)
      ? data
          .filter(isRecord)
          .map((override) => normalizeOverride(override))
          .filter((override): override is IFeatureOverride => override !== null)
      : [];

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

    const listeners = this.subscriptionListeners.get(userId);
    if (listeners) {
      listeners.add(callback);
    }

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
