import { isRecord } from "@workspace/utils";
import type { ISubscription } from "./interfaces";
import { parseFeatureList } from "./repository-feature-helpers";
import { parseTier } from "./repository-tier-helpers";

export function normalizeSubscription(raw: unknown): ISubscription {
  if (!isRecord(raw)) return createDefaultSubscription();
  const status = readOptionalString(raw.status);
  return {
    tier: parseTier(readOptionalString(raw.tier)),
    status: isValidStatus(status) ? status : "active",
    features: parseFeatureList(raw.features),
    startDate: readDate(raw.startDate),
    endDate: raw.endDate != null ? readDate(raw.endDate) : undefined,
    billingCycle: raw.billingCycle === "yearly" ? "yearly" : "monthly",
  };
}

export function isValidStatus(
  status?: string,
): status is ISubscription["status"] {
  return ["active", "past_due", "canceled", "trialing"].includes(status || "");
}

export function createDefaultSubscription(): ISubscription {
  return {
    tier: parseTier(),
    status: "active",
    features: [],
    startDate: new Date(),
    billingCycle: "monthly",
  };
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function readDate(value: unknown): Date {
  return new Date(
    typeof value === "string" || typeof value === "number" ? value : Date.now(),
  );
}
