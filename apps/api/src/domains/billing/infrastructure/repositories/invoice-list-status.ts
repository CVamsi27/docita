import { z } from 'zod';
import { InvoiceStatus } from '@workspace/db';

const invoiceListStatusSchema = z.nativeEnum(InvoiceStatus);

export function parseInvoiceListStatus(
  status: string | undefined,
): InvoiceStatus | undefined {
  if (!status || status === 'all') return undefined;
  const parsed = invoiceListStatusSchema.safeParse(status);
  return parsed.success ? parsed.data : undefined;
}
