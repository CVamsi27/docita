import {
  internalTierPricingRowSchema,
  TIER_LIMITS,
  tierSchema,
} from "@workspace/types";
import type { InternalPaymentTierPricingRow } from "../pricing.types";

function tierPriceIsCustom(
  tier: string,
  price: number | null | undefined,
): boolean {
  return tier === "ENTERPRISE" || price === null;
}

function isInternalPaymentTierPricingRow(
  value: unknown,
): value is InternalPaymentTierPricingRow {
  if (!value || typeof value !== "object") {
    return false;
  }
  const row = value as InternalPaymentTierPricingRow;
  return (
    typeof row.tier === "string" &&
    typeof row.price === "number" &&
    typeof row.billingCycle === "string" &&
    typeof row.maxDoctors === "number" &&
    typeof row.maxPatients === "number" &&
    Array.isArray(row.features)
  );
}

function resolveMaxPatients(tier: string, maxDoctors: number): number {
  const parsed = tierSchema.safeParse(tier);
  if (parsed.success) {
    return TIER_LIMITS[parsed.data].patients ?? 999_999;
  }
  if (maxDoctors < 0) {
    return 999_999;
  }
  return 500;
}

export function mapInternalTierPricingApiRow(
  row: {
    tier: string;
    name?: string;
    price?: number | null;
    maxDoctors?: number;
    aiEnabled?: boolean;
  },
): InternalPaymentTierPricingRow {
  const maxDoctors = row.maxDoctors ?? -1;
  const priceIsCustom = tierPriceIsCustom(row.tier, row.price);

  return {
    tier: row.tier,
    displayName: row.name,
    price: row.price ?? 0,
    priceIsCustom,
    billingCycle: priceIsCustom ? "custom" : "monthly",
    maxDoctors,
    maxPatients: resolveMaxPatients(row.tier, maxDoctors),
    features: row.aiEnabled ? ["AI enabled"] : [],
  };
}

export function normalizeInternalTierPricingResponse(
  data: unknown,
  fallbackTiers: InternalPaymentTierPricingRow[],
): InternalPaymentTierPricingRow[] {
  const rawRows = Array.isArray(data)
    ? data
    : data &&
        typeof data === "object" &&
        "tiers" in data &&
        Array.isArray((data as { tiers: unknown }).tiers)
      ? (data as { tiers: unknown[] }).tiers
      : null;

  if (!rawRows?.length) {
    return fallbackTiers;
  }

  const mapped: InternalPaymentTierPricingRow[] = [];

  for (const entry of rawRows) {
    if (isInternalPaymentTierPricingRow(entry)) {
      mapped.push({
        ...entry,
        priceIsCustom:
          entry.priceIsCustom ??
          tierPriceIsCustom(entry.tier, entry.price),
      });
      continue;
    }

    const parsed = internalTierPricingRowSchema.safeParse(entry);
    if (parsed.success) {
      mapped.push(mapInternalTierPricingApiRow(parsed.data));
      continue;
    }

    if (entry && typeof entry === "object" && "tier" in entry) {
      mapped.push(
        mapInternalTierPricingApiRow(
          entry as {
            tier: string;
            name?: string;
            price?: number | null;
            maxDoctors?: number;
            aiEnabled?: boolean;
          },
        ),
      );
    }
  }

  return mapped.length > 0 ? mapped : fallbackTiers;
}
