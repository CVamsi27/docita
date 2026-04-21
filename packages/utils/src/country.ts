export const DEFAULT_COUNTRY_CODE = "IN";

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

  if (typeof source !== "object" || Array.isArray(source)) {
    return undefined;
  }

  const record = source as Record<string, unknown>;

  const operatingCountry = normalizeCountryCode(
    typeof record["operatingCountryCode"] === "string"
      ? record["operatingCountryCode"]
      : undefined,
  );
  if (operatingCountry) {
    return operatingCountry;
  }

  const directCountry = normalizeCountryCode(
    typeof record["countryCode"] === "string" ? record["countryCode"] : undefined,
  );
  if (directCountry) {
    return directCountry;
  }

  const taxSettings = record["taxSettings"];
  const taxCountry =
    taxSettings &&
    typeof taxSettings === "object" &&
    !Array.isArray(taxSettings)
      ? normalizeCountryCode(
          typeof (taxSettings as Record<string, unknown>)["countryCode"] ===
            "string"
            ? ((taxSettings as Record<string, unknown>)["countryCode"] as string)
            : undefined,
        )
      : undefined;
  if (taxCountry) {
    return taxCountry;
  }

  return resolveCountryCode(record["settings"]);
}

export function resolveCountryCodeOrDefault(
  source: unknown,
  fallback = DEFAULT_COUNTRY_CODE,
): string {
  return resolveCountryCode(source) ?? fallback;
}
