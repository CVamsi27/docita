export function readRazorpayNoteString(
  notes: Record<string, unknown> | undefined,
  key: string,
): string | undefined {
  const value = notes?.[key];
  return typeof value === 'string' ? value : undefined;
}
