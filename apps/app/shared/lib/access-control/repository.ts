import { Feature, Tier } from "@workspace/types";
import { isRecord, parseStringEnumMember } from "@workspace/utils";
import { browserRequest } from "@/lib/auth/browser-request";
import {
  AddOnType,
  type IAccessContext,
  type IAddOn,
  type IFeatureOverride,
  type ISubscription,
  type ISubscriptionRepository,
} from "./interfaces";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const ADD_ON_TYPE_VALUES = Object.values(AddOnType).filter(
  (value): value is AddOnType => typeof value === "string",
);

const TIER_NUMERIC_VALUES = new Set(
  Object.values(Tier).filter((value): value is Tier => typeof value === "number"),
);

const FEATURE_VALUE_SET = new Set<string>(Object.values(Feature));

function isTierNumber(value: number): value is Tier {
  return TIER_NUMERIC_VALUES.has(value);
}

function isTierNameKey(value: string): value is keyof typeof Tier {
  return value in Tier;
}

function isFeatureValue(value: string): value is Feature {
  return FEATURE_VALUE_SET.has(value);
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
    const subscription = this.normalizeSubscription(data);

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
    const addOns = this.parseAddOnList(data);

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
          .map((override) => this.normalizeOverride(override))
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

  private parseTier(value?: string): Tier {
    if (!value) {
      return Tier.STARTER;
    }

    const numericTier = Number(value);
    if (Number.isInteger(numericTier) && isTierNumber(numericTier)) {
      return numericTier;
    }

    if (isTierNameKey(value)) {
      const mappedTier = Tier[value];
      if (typeof mappedTier === "number") {
        return mappedTier;
      }
    }

    return Tier.STARTER;
  }

  private isValidFeature(value: string): value is Feature {
    return isFeatureValue(value);
  }

  private parseAddOnList(data: unknown): IAddOn[] {
    if (!Array.isArray(data)) {
      return [];
    }
    return data.flatMap((item) => {
      const normalized = this.normalizeAddOn(item);
      return normalized ? [normalized] : [];
    });
  }

  private normalizeAddOn(raw: unknown): IAddOn | null {
    if (!isRecord(raw)) {
      return null;
    }
    const type = raw.type;
    const status = raw.status;
    if (typeof type !== "string" || typeof status !== "string") {
      return null;
    }
    if (
      status !== "active" &&
      status !== "inactive" &&
      status !== "suspended"
    ) {
      return null;
    }
    const parsedType = parseStringEnumMember(ADD_ON_TYPE_VALUES, type);
    if (!parsedType) {
      return null;
    }
    const billingCycle = raw.billingCycle === "yearly" ? "yearly" : "monthly";
    return {
      type: parsedType,
      status,
      baseQuota: typeof raw.baseQuota === "number" ? raw.baseQuota : 0,
      usedQuota: typeof raw.usedQuota === "number" ? raw.usedQuota : 0,
      overageRate: typeof raw.overageRate === "number" ? raw.overageRate : 0,
      billingCycle,
      expiresAt:
        raw.expiresAt != null ? new Date(String(raw.expiresAt)) : undefined,
    };
  }

  private normalizeSubscription(raw: unknown): ISubscription {
    if (!isRecord(raw)) {
      return this.createDefaultSubscription();
    }
    const tier = typeof raw.tier === "string" ? raw.tier : undefined;
    const status = typeof raw.status === "string" ? raw.status : undefined;
    const startDate = raw.startDate;
    const endDate = raw.endDate;
    const billingCycle = raw.billingCycle;
    return {
      tier: this.parseTier(tier),
      status: this.isValidStatus(status) ? status : "active",
      features: Array.isArray(raw.features)
        ? raw.features
            .filter((f): f is string => typeof f === "string")
            .filter((f): f is Feature => isFeatureValue(f))
        : [],
      startDate: new Date(
        typeof startDate === "string" || typeof startDate === "number"
          ? startDate
          : Date.now(),
      ),
      endDate:
        endDate != null
          ? new Date(typeof endDate === "string" || typeof endDate === "number" ? endDate : Date.now())
          : undefined,
      billingCycle: billingCycle === "yearly" ? "yearly" : "monthly",
    };
  }

  private normalizeOverride(raw: Record<string, unknown>): IFeatureOverride | null {
    const feature = typeof raw.feature === "string" ? raw.feature : "";
    if (!this.isValidFeature(feature)) {
      return null;
    }

    return {
      feature,
      granted: Boolean(raw.granted),
      reason: String(raw.reason || ""),
      grantedBy: String(raw.grantedBy || ""),
      expiresAt:
        raw.expiresAt != null ? new Date(String(raw.expiresAt)) : undefined,
      createdAt: new Date(String(raw.createdAt ?? Date.now())),
    };
  }

  private isValidStatus(status?: string): status is ISubscription["status"] {
    return ["active", "past_due", "canceled", "trialing"].includes(
      status || "",
    );
  }

  private createDefaultSubscription(): ISubscription {
    return {
      tier: Tier.STARTER,
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
