"use client";

import { useParams } from "next/navigation";
import { Feature } from "@workspace/types";
import { FeatureGate } from "@/components/auth/feature-gate";
import { InvoiceEditUI } from "@/features/invoices/components";

export function InvoiceEditPageClient() {
  const params = useParams<{ id: string }>();
  return (
    <FeatureGate feature={Feature.INVOICING} showLockedCard>
      <InvoiceEditUI invoiceId={params.id} />
    </FeatureGate>
  );
}
