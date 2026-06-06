import { z } from "zod";
import {
  internalTierPricingRowSchema,
  TIER_LIMITS,
  tierSchema,
} from "@workspace/types";
import type { InternalPaymentTierPricingRow } from "../pricing.types";

const tierPricingEnvelopeSchema = z.object({
  tiers: z.array(z.unknown()),
});

const internalTierPricingApiRowInputSchema = z.object({
  tier: z.string(),
  name: z.string().optional(),
  price: z.number().nullable().optional(),
  maxDoctors: z.number().optional(),
  aiEnabled: z.boolean().optional(),
});

function tierPriceIsCustom(
  tier: string,
  price: number | null | undefined,
): boolean {
  return tier === "ENTERPRISE" || price === null;
}

function isInternalPaymentTierPricingRow(
  value: unknown,
): value is InternalPaymentTierPricingRow {
  if (!value || typeof value !== "object") return false;

  return (
    "tier" in value &&
    typeof value.tier === "string" &&
    "price" in value &&
    typeof value.price === "number" &&
    "billingCycle" in value &&
    typeof value.billingCycle === "string" &&
    "maxDoctors" in value &&
    typeof value.maxDoctors === "number" &&
    "maxPatients" in value &&
    typeof value.maxPatients === "number" &&
    "features" in value &&
    Array.isArray(value.features)
  );
}

function extractRawTierRows(data: unknown): unknown[] | null {
  if (Array.isArray(data)) {
    return data;
  }

  const envelope = tierPricingEnvelopeSchema.safeParse(data);
  if (envelope.success) return envelope.data.tiers;

  return null;
}

function resolveMaxPatients(tier: string, maxDoctors: number): number {
  const parsed = tierSchema.safeParse(tier);
  if (parsed.success) return TIER_LIMITS[parsed.data].patients ?? 999_999;
  if (maxDoctors < 0) return 999_999;
  return 500;
}

export function mapInternalTierPricingApiRow(
  row: z.infer<typeof internalTierPricingApiRowInputSchema>,
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
  const rawRows = extractRawTierRows(data);

  if (!rawRows?.length) return fallbackTiers;

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

    const loose = internalTierPricingApiRowInputSchema.safeParse(entry);
    if (loose.success) {
      mapped.push(mapInternalTierPricingApiRow(loose.data));
    }
  }

  return mapped.length > 0 ? mapped : fallbackTiers;
}
