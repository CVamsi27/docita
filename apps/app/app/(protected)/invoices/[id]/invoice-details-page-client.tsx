"use client";

import { useParams } from "next/navigation";
import { Feature } from "@workspace/types";
import { FeatureGate } from "@/components/auth/feature-gate";
import { InvoiceDetailsUI } from "@/features/invoices/components";

export function InvoiceDetailsPageClient() {
  const params = useParams<{ id: string }>();
  const id = params.id ?? "";
  return (
    <FeatureGate feature={Feature.INVOICING} showLockedCard>
      <InvoiceDetailsUI invoiceId={id} />
    </FeatureGate>
  );
}
