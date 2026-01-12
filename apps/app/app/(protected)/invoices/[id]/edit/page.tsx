import { InvoiceEditUI } from "@/features/invoices/components/InvoiceEditUI";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function InvoiceEditPage({ params }: PageProps) {
  const { id } = await params;
  return <InvoiceEditUI invoiceId={id} />;
}
