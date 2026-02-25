import { InvoiceDetailsUI } from "@/features/invoices/components";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function InvoiceDetailsPage({ params }: PageProps) {
  const { id } = await params;
  return <InvoiceDetailsUI invoiceId={id} />;
}
