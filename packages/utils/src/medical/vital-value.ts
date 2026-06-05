export function parseVitalNumber(
  value: number | string | undefined,
): number | null {
  if (value === undefined) return null;
  const parsed =
    typeof value === "string"
      ? parseFloat(value.split("/")[0] || value)
      : value;
  return Number.isNaN(parsed) ? null : parsed;
}
