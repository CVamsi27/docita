"use client";

import { useParams } from "next/navigation";
import { Feature } from "@workspace/types";
import { FeatureGate } from "@/features/_shared/components/auth/feature-gate";
import { InvoiceDetailsUI } from "@/features/invoices/components";

export default function InvoiceDetailsPage() {
  const params = useParams();
  const id = params["id"] as string;
  return (
    <FeatureGate feature={Feature.INVOICING} showLockedCard>
      <InvoiceDetailsUI invoiceId={id} />
    </FeatureGate>
  );
}
