import { Prisma } from '@workspace/db';
import type { InternalAdditionalChargeCategory } from '@workspace/types';

export const INTERNAL_ADDITIONAL_CHARGE_PREFIX = '[INTERNAL:';

export const INTERNAL_ADDITIONAL_CHARGE_CATEGORY_LABELS: Record<
  InternalAdditionalChargeCategory,
  string
> = {
  GUIDED_SETUP: 'Guided setup',
  DATA_MIGRATION: 'Data migration',
  CUSTOM_TRAINING: 'Custom training',
  INTEGRATION: 'Integration',
  COMMERCIAL_DISCOUNT: 'Commercial discount / adjustment',
  OTHER: 'Other service',
};

export type SubscriptionPaymentWithClinic = Prisma.SubscriptionPaymentGetPayload<{
  include: {
    subscription: {
      include: { clinic: { select: { id: true; name: true } } };
    };
    clinic: { select: { id: true; name: true } };
  };
}>;

export function normalizePaymentGatewayStatus(
  status: string,
): 'SUCCESS' | 'PENDING' | 'FAILED' {
  const normalized = status.toLowerCase();
  if (normalized === 'paid' || normalized === 'success') {
    return 'SUCCESS';
  }
  if (normalized === 'failed' || normalized === 'refunded') {
    return 'FAILED';
  }
  if (normalized === 'pending') {
    return 'PENDING';
  }
  return 'PENDING';
}

export function planLabelFromInternalPayment(
  description: string | null,
): string | null {
  if (!description?.startsWith(INTERNAL_ADDITIONAL_CHARGE_PREFIX)) {
    return null;
  }
  const end = description.indexOf(
    ']',
    INTERNAL_ADDITIONAL_CHARGE_PREFIX.length,
  );
  if (end === -1) {
    return null;
  }
  const key = description.slice(
    INTERNAL_ADDITIONAL_CHARGE_PREFIX.length,
    end,
  ) as InternalAdditionalChargeCategory;
  return INTERNAL_ADDITIONAL_CHARGE_CATEGORY_LABELS[key] ?? key;
}

export function mapSubscriptionPaymentRow(p: SubscriptionPaymentWithClinic) {
  const clinicName =
    p.subscription?.clinic?.name ?? p.clinic?.name ?? 'Unknown clinic';
  const internalLabel = planLabelFromInternalPayment(p.description);
  const planLabel =
    internalLabel ??
    (p.subscription ? String(p.subscription.plan) : 'Recorded payment');
  return {
    id: p.id,
    clinicName,
    planLabel,
    amount: p.amountCents / 100,
    currency: p.currency,
    status: normalizePaymentGatewayStatus(p.status),
    gatewayPaymentId: p.razorpayPaymentId ?? undefined,
    description: p.description ?? undefined,
    paidAt: p.paidAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
  };
}
