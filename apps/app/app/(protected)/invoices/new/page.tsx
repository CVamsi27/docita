"use client";

import { Feature } from "@workspace/types";
import { FeatureGate } from "@/components/auth/feature-gate";
import { InvoiceCreateUI } from "@/features/invoices/components";

export default function CreateInvoicePage() {
  return (
    <FeatureGate feature={Feature.INVOICING} showLockedCard>
      <InvoiceCreateUI />
    </FeatureGate>
  );
}
