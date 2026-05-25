import { isRecord } from "./is-record.js";

export const DEFAULT_COUNTRY_CODE = "IN" as const;

export function normalizeCountryCode(
  value: string | null | undefined,
): string | undefined {
  const next = value?.trim().toUpperCase();
  if (!next || !/^[A-Z]{2}$/.test(next)) {
    return undefined;
  }

  return next;
}

export function resolveCountryCode(source: unknown): string | undefined {
  if (!source) return undefined;

  if (typeof source === "string") {
    return normalizeCountryCode(source);
  }

  if (!isRecord(source)) {
    return undefined;
  }

  const operatingCountry = normalizeCountryCode(
    typeof source["operatingCountryCode"] === "string"
      ? source["operatingCountryCode"]
      : undefined,
  );
  if (operatingCountry) {
    return operatingCountry;
  }

  const directCountry = normalizeCountryCode(
    typeof source["countryCode"] === "string" ? source["countryCode"] : undefined,
  );
  if (directCountry) {
    return directCountry;
  }

  const taxSettings = source["taxSettings"];
  if (isRecord(taxSettings)) {
    const taxCountry = normalizeCountryCode(
      typeof taxSettings["countryCode"] === "string"
        ? taxSettings["countryCode"]
        : undefined,
    );
    if (taxCountry) {
      return taxCountry;
    }
  }

  return resolveCountryCode(source["settings"]);
}

export function resolveCountryCodeOrDefault(
  source: unknown,
  fallback = DEFAULT_COUNTRY_CODE,
): string {
  return resolveCountryCode(source) ?? fallback;
}
