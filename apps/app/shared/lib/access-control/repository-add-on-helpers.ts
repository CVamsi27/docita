import { parseStringEnumMember, isRecord } from "@workspace/utils";
import { AddOnType, type IAddOn } from "./interfaces";

const ADD_ON_TYPE_VALUES = Object.values(AddOnType).filter(
  (value): value is AddOnType => typeof value === "string",
);

export function parseAddOnList(data: unknown): IAddOn[] {
  if (!Array.isArray(data)) return [];
  return data.flatMap((item) => {
    const normalized = normalizeAddOn(item);
    return normalized ? [normalized] : [];
  });
}

export function normalizeAddOn(raw: unknown): IAddOn | null {
  if (!isRecord(raw)) return null;
  const type = parseAddOnType(raw.type);
  const status = parseAddOnStatus(raw.status);
  if (!type || !status) return null;
  return {
    type,
    status,
    baseQuota: readNumber(raw.baseQuota),
    usedQuota: readNumber(raw.usedQuota),
    overageRate: readNumber(raw.overageRate),
    billingCycle: raw.billingCycle === "yearly" ? "yearly" : "monthly",
    expiresAt:
      raw.expiresAt != null ? new Date(String(raw.expiresAt)) : undefined,
  };
}

function parseAddOnType(value: unknown): AddOnType | null {
  return typeof value === "string"
    ? parseStringEnumMember(ADD_ON_TYPE_VALUES, value)
    : null;
}

function parseAddOnStatus(value: unknown): IAddOn["status"] | null {
  if (value !== "active" && value !== "inactive" && value !== "suspended") return null;
  return value;
}

function readNumber(value: unknown): number {
  return typeof value === "number" ? value : 0;
}
