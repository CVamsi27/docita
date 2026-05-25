export function timelineDateRange(
  field: string,
  from?: Date,
  to?: Date,
): Record<string, unknown> {
  if (!from && !to) return {};
  const range: Record<string, Date> = {};
  if (from) range.gte = from;
  if (to) range.lte = to;
  return { [field]: range };
}
