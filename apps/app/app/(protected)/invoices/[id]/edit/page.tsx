"use client";

import { useParams } from "next/navigation";
import { Feature } from "@workspace/types";
import { FeatureGate } from "@/features/_shared/components/auth/feature-gate";
import { InvoiceEditUI } from "@/features/invoices/components";

export default function InvoiceEditPage() {
  const params = useParams<{ id: string }>();
  return (
    <FeatureGate feature={Feature.INVOICING} showLockedCard>
      <InvoiceEditUI invoiceId={params.id} />
    </FeatureGate>
  );
}
