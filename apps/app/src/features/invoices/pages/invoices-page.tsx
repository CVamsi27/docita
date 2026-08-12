import { useParams } from "react-router";
import { PageMeta } from "@/components/layout/page-meta";
import { InvoicesPageUI } from "@/features/invoices/components/list/InvoicesPageUI";
import { InvoiceCreateUI } from "@/features/invoices/components/forms/InvoiceCreateUI";
import { InvoiceEditUI } from "@/features/invoices/components/forms/InvoiceEditUI";
import { InvoiceDetailsUI } from "@/features/invoices/components/details/InvoiceDetailsUI";

export function InvoicesListPage() {
  return (
    <>
      <PageMeta
        title="Invoices"
        description="Manage clinic invoices and payments"
      />
      <InvoicesPageUI />
    </>
  );
}

export function InvoiceNewPage() {
  return (
    <>
      <PageMeta title="New Invoice" description="Create a new invoice" />
      <InvoiceCreateUI />
    </>
  );
}

export function InvoiceDetailPage() {
  const { id } = useParams();
  return (
    <>
      <PageMeta title="Invoice Details" description="Invoice details and payments" />
      <InvoiceDetailsUI invoiceId={id ?? ""} />
    </>
  );
}

export function InvoiceEditPage() {
  const { id } = useParams();
  return (
    <>
      <PageMeta title="Edit Invoice" description="Edit invoice details" />
      <InvoiceEditUI invoiceId={id ?? ""} />
    </>
  );
}
