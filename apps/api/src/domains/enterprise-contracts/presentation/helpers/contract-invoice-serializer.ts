export function serializeContractInvoice<
  T extends {
    periodStart: Date;
    periodEnd: Date;
    createdAt: Date;
    updatedAt: Date;
  },
>(invoice: T) {
  return {
    ...invoice,
    periodStart: invoice.periodStart.toISOString(),
    periodEnd: invoice.periodEnd.toISOString(),
    createdAt: invoice.createdAt.toISOString(),
    updatedAt: invoice.updatedAt.toISOString(),
  };
}
