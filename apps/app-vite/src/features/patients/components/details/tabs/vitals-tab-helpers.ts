export const formatVitalNumber = (
  value: number | null | undefined,
  suffix = "",
): string =>
  value === null || value === undefined ? "--" : `${value}${suffix}`;
