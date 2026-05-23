import { InvoiceEditUI } from "@/features/invoices/components/forms/InvoiceEditUI";

type InvoiceEditPageProps = {
  params: Promise<{ id: string }>;
};

export default async function InvoiceEditPage({ params }: InvoiceEditPageProps) {
  const { id } = await params;
  return <InvoiceEditUI invoiceId={id} />;
}
