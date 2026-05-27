import { BadRequestException } from '@nestjs/common';
import { InvoiceStatus } from '@workspace/db';

const ALLOWED_INVOICE_STATUS_TRANSITIONS: Record<
  InvoiceStatus,
  InvoiceStatus[]
> = {
  [InvoiceStatus.PENDING]: [
    InvoiceStatus.PAID,
    InvoiceStatus.PARTIALLY_PAID,
    InvoiceStatus.OVERDUE,
    InvoiceStatus.CANCELLED,
  ],
  [InvoiceStatus.PARTIALLY_PAID]: [
    InvoiceStatus.PAID,
    InvoiceStatus.OVERDUE,
    InvoiceStatus.CANCELLED,
  ],
  [InvoiceStatus.OVERDUE]: [
    InvoiceStatus.PAID,
    InvoiceStatus.PARTIALLY_PAID,
    InvoiceStatus.CANCELLED,
  ],
  [InvoiceStatus.PAID]: [],
  [InvoiceStatus.CANCELLED]: [],
};

export function requiresClaimReadinessValidation(
  currentStatus: InvoiceStatus,
  targetStatus: InvoiceStatus,
): boolean {
  if (currentStatus === targetStatus) return false;
  return (
    targetStatus === InvoiceStatus.PAID ||
    targetStatus === InvoiceStatus.PARTIALLY_PAID ||
    targetStatus === InvoiceStatus.OVERDUE
  );
}

export function assertInvoiceStatusTransition(
  currentStatus: InvoiceStatus,
  targetStatus: InvoiceStatus,
): void {
  if (currentStatus === targetStatus) return;
  if (
    currentStatus === InvoiceStatus.PAID ||
    currentStatus === InvoiceStatus.CANCELLED
  ) {
    throw new BadRequestException(
      `Cannot transition invoice from ${currentStatus} to ${targetStatus}`,
    );
  }

  if (
    !ALLOWED_INVOICE_STATUS_TRANSITIONS[currentStatus].includes(targetStatus)
  ) {
    throw new BadRequestException(
      `Cannot transition invoice from ${currentStatus} to ${targetStatus}`,
    );
  }
}
