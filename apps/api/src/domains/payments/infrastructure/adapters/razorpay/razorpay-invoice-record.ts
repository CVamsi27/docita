import { isRecord } from '@workspace/utils';

export function asRazorpayInvoiceRecord(
  value: unknown,
): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

export function readInvoiceNumberField(
  invoice: Record<string, unknown>,
  key: string,
  fallback = 0,
): number {
  const value = invoice[key];
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

export function readInvoiceStringField(
  invoice: Record<string, unknown>,
  key: string,
  fallback: string | null = null,
): string | null {
  const value = invoice[key];
  return typeof value === 'string' ? value : fallback;
}
