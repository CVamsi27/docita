import { BadRequestException } from '@nestjs/common';

/**
 * Convert a rupee amount to integer paise for storage, validating it's a
 * sane payment amount (non-negative, at most two decimal places of rupees).
 * Shared by every flow that records a payment session — Razorpay link
 * creation and manual settlement alike — so the same guardrails apply
 * everywhere instead of drifting into near-identical copies.
 */
export function toPaiseAmount(amount: number): number {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new BadRequestException('Payment amount must be non-negative');
  }
  const paise = Math.round(amount * 100);
  if (Math.abs(paise / 100 - amount) > Number.EPSILON) {
    throw new BadRequestException(
      'Payment amount must have at most two decimal places',
    );
  }
  return paise;
}
