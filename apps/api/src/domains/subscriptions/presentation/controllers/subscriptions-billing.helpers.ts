import { BadRequestException } from '@nestjs/common';
import { isSubscriptionBillingRowPaid } from '@workspace/utils';
import { RequestWithUser } from '@/shared/common/types/common.types';

export function requireBillingClinicId(req: RequestWithUser): string {
  const clinicId = req.user?.clinicId;
  if (!clinicId) throw new BadRequestException('Clinic ID not found');
  return clinicId;
}

type BillingPaymentRow = {
  id?: string;
  amountCents: number;
  subtotalCents?: number | null;
  taxCents?: number | null;
  grandTotalCents?: number | null;
  currency: string;
  status?: string;
  invoiceUrl?: string | null;
  invoiceNumber?: string | null;
  invoiceType?: string | null;
  taxSummary?: unknown;
  description?: string | null;
  paidAt?: Date | null;
  createdAt: Date;
  getStatus?: () => unknown;
};

export function mapSubscriptionBillingPayments(payments: BillingPaymentRow[]) {
  return payments.map((p) => {
    const status = (
      p.status ?? String(p.getStatus?.() ?? 'pending')
    ).toLowerCase();
    const isPaid = isSubscriptionBillingRowPaid(status, p.paidAt);
    const receiptUrl =
      isPaid && typeof p.invoiceUrl === 'string' ? p.invoiceUrl : undefined;
    return {
      id: p.id,
      amountCents: p.amountCents,
      amount: p.amountCents / 100,
      subtotalCents: p.subtotalCents ?? undefined,
      taxCents: p.taxCents ?? undefined,
      grandTotalCents: p.grandTotalCents ?? undefined,
      currency: p.currency,
      status,
      description: p.description ?? undefined,
      payUrl: isPaid ? undefined : (p.invoiceUrl ?? undefined),
      receiptUrl,
      invoiceUrl: p.invoiceUrl ?? undefined,
      invoiceNumber: p.invoiceNumber ?? undefined,
      invoiceType: p.invoiceType ?? undefined,
      taxSummary: p.taxSummary ?? undefined,
      paidAt: p.paidAt ? p.paidAt.toISOString() : undefined,
      createdAt: p.createdAt.toISOString(),
    };
  });
}
