import { FC, type ReactNode } from "react";
import { Feature } from "@workspace/types";
import { PageFeatureGate } from "@/components/auth/PageFeatureGate";
import {
  AppPageScaffold,
  Button,
  DataState,
  Form,
  PageHeader,
} from "@workspace/ui/components";
import { FileText, Save } from "lucide-react";
import { useInvoiceEditLogic } from "@/features/invoices/hooks/use-invoice-edit-logic";
import { BackButton } from "@/components/navigation/back-button";
import { useBackNavigation } from "@/hooks/use-back-navigation";
import { editInvoiceItemFieldPath } from "@/features/invoices/lib/invoice-form-paths";
import { InvoiceEditDetailsSection } from "./InvoiceEditUISections";
import {
  InvoiceLineItemsSectionContainer,
  InvoiceNotesSection,
} from "./invoice-form-sections-shared";

interface InvoiceEditUIProps {
  invoiceId: string;
}

function withInvoicingGate(node: ReactNode) {
  return (
    <PageFeatureGate feature={Feature.INVOICING} title="Edit invoice">
      {node}
    </PageFeatureGate>
  );
}

export const InvoiceEditUI: FC<InvoiceEditUIProps> = ({ invoiceId }) => {
  const invoiceFallback = `/invoices/${invoiceId}`;
  const goBack = useBackNavigation(invoiceFallback);
  const {
    form,
    fields,
    append,
    remove,
    onSubmit,
    invoice,
    isLoading,
    isSaving,
    error,
    refetch,
    totalAmount,
    router,
  } = useInvoiceEditLogic(invoiceId);

  if (isLoading || error || !invoice) {
    return withInvoicingGate(
      <AppPageScaffold header={<PageHeader title="Edit invoice" />}>
        <DataState
          status={isLoading ? "loading" : error ? "error" : "empty"}
          loadingMessage="Loading invoice…"
          errorMessage="We could not load this invoice. Please try again."
          onRetry={() => void refetch()}
          emptyIcon={FileText}
          emptyTitle="Invoice not found"
          emptyDescription="The invoice you are looking for is unavailable."
          emptyAction={{
            label: "Back to Invoices",
            onClick: () => router("/invoices"),
          }}
        />
      </AppPageScaffold>,
    );
  }

  return withInvoicingGate(
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <BackButton fallback={invoiceFallback} label="Cancel" />
        <div>
          <h1 className="ui-page-title">Edit invoice</h1>
          <p className="text-muted-foreground">
            Make changes to invoice #{invoice.id}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
          className="space-y-6"
        >
          <InvoiceEditDetailsSection control={form.control} />

          <InvoiceLineItemsSectionContainer
            control={form.control}
            setValue={form.setValue}
            fields={fields}
            append={append}
            remove={remove}
            totalAmount={totalAmount}
            buildFieldPath={editInvoiceItemFieldPath}
          />

          <InvoiceNotesSection control={form.control} />

          <div className="flex flex-wrap justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={goBack}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving} aria-busy={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              Update Invoice
            </Button>
          </div>
        </form>
      </Form>
    </div>,
  );
};
