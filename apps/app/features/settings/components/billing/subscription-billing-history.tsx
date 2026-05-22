"use client";

import { useBillingHistory } from "@workspace/data-access";
import { BillingHistoryTable } from "@/features/subscription";

interface BillingHistoryProps {
  emptyStateDescription?: string;
}

export function BillingHistory({ emptyStateDescription }: BillingHistoryProps) {
  const { data: invoices, isLoading } = useBillingHistory();
  return (
    <BillingHistoryTable
      invoices={invoices}
      isLoading={isLoading}
      emptyStateDescription={emptyStateDescription}
    />
  );
}
