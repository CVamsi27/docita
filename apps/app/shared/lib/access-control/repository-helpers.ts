import { Feature, Tier } from "@workspace/types";
import { isRecord, parseStringEnumMember } from "@workspace/utils";
import {
  AddOnType,
  type IAddOn,
  type IFeatureOverride,
  type ISubscription,
} from "./interfaces";

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

export function parseTier(value?: string): Tier {
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

export function isValidFeature(value: string): value is Feature {
  return isFeatureValue(value);
}

export function parseAddOnList(data: unknown): IAddOn[] {
  if (!Array.isArray(data)) {
    return [];
  }
  return data.flatMap((item) => {
    const normalized = normalizeAddOn(item);
    return normalized ? [normalized] : [];
  });
}

export function normalizeAddOn(raw: unknown): IAddOn | null {
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

export function normalizeSubscription(raw: unknown): ISubscription {
  if (!isRecord(raw)) {
    return createDefaultSubscription();
  }
  const tier = typeof raw.tier === "string" ? raw.tier : undefined;
  const status = typeof raw.status === "string" ? raw.status : undefined;
  const startDate = raw.startDate;
  const endDate = raw.endDate;
  const billingCycle = raw.billingCycle;
  return {
    tier: parseTier(tier),
    status: isValidStatus(status) ? status : "active",
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

export function normalizeOverride(raw: Record<string, unknown>): IFeatureOverride | null {
  const feature = typeof raw.feature === "string" ? raw.feature : "";
  if (!isValidFeature(feature)) {
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

export function isValidStatus(status?: string): status is ISubscription["status"] {
  return ["active", "past_due", "canceled", "trialing"].includes(
    status || "",
  );
}

export function createDefaultSubscription(): ISubscription {
  return {
    tier: Tier.STARTER,
    status: "active",
    features: [],
    startDate: new Date(),
    billingCycle: "monthly",
  };
}
