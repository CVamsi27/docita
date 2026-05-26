import { InvoiceEditUI } from "@/features/invoices/components/forms/InvoiceEditUI";

import { useParams } from "next/navigation";
import { Feature } from "@workspace/types";
import { FeatureGate } from "@/components/auth/feature-gate";
import { InvoiceEditUI } from "@/features/invoices/components";

export default async function InvoiceEditPage({ params }: InvoiceEditPageProps) {
  const { id } = await params;
  return <InvoiceEditUI invoiceId={id} />;
}
