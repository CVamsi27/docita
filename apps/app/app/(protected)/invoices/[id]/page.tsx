import { InvoiceDetailsUI } from "@/features/invoices/components/details/InvoiceDetailsUI";

type InvoiceDetailsPageProps = {
  params: Promise<{ id: string }>;
};

export default async function InvoiceDetailsPage({
  params,
}: InvoiceDetailsPageProps) {
  const { id } = await params;
  return <InvoiceDetailsUI invoiceId={id} />;
}
