import { isRecord } from '@workspace/utils';

export function asRazorpayRecord(
  value: unknown,
): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

export function readRazorpayStringNotes(
  value: unknown,
): Record<string, string> | undefined {
  const record = asRazorpayRecord(value);
  if (!record) return undefined;

  const notes: Record<string, string> = {};
  for (const [key, entry] of Object.entries(record)) {
    if (typeof entry === 'string') {
      notes[key] = entry;
    }
  }

  return Object.keys(notes).length > 0 ? notes : undefined;
}
