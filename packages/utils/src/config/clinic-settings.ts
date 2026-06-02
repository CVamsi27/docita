type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readTrimmedString(
  record: UnknownRecord | undefined,
  key: string,
): string | undefined {
  const value = record?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

/** Read GSTIN from the canonical clinic settings JSON shape. */
export function getClinicGstin(settings: unknown): string | undefined {
  if (!isRecord(settings)) return undefined;
  const taxSettings = isRecord(settings["taxSettings"])
    ? settings["taxSettings"]
    : undefined;
  return (
    readTrimmedString(settings, "gstin") ??
    readTrimmedString(taxSettings, "registrationId")
  );
}
