"use client";

import { Feature } from "@workspace/types";
import { FeatureGate } from "@/features/_shared/components/auth/feature-gate";
import { InvoicesPageUI } from "@/features/invoices/components";

export default function InvoicesListPage() {
  return (
    <FeatureGate feature={Feature.INVOICING} showLockedCard>
      <InvoicesPageUI />
    </FeatureGate>
  );
}
