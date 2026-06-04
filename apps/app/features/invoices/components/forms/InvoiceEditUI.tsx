"use client";

import { FC, type ReactNode } from "react";
import { Feature } from "@workspace/types";
import { FeatureGate } from "@/components/auth/feature-gate";
import { Button } from "@workspace/ui/components/form/button";
import {
  Form,
} from "@workspace/ui/components/form/form";
import { FileText, Save } from "lucide-react";
import { useInvoiceEditLogic } from "@/features/invoices/hooks/use-invoice-edit-logic";
import { BackButton } from "@/components/navigation/back-button";
import { useBackNavigation } from "@/hooks/use-back-navigation";
import {
  EmptyState,
  LoadingState,
} from "@workspace/ui/components/feedback/empty-state";
import { InvoiceEditDetailsSection } from "./InvoiceEditUISections";
import { InvoiceEditLineItemsSection } from "./InvoiceEditUISections";
import { InvoiceEditNotesSection } from "./InvoiceEditUISections";

interface InvoiceEditUIProps {
  invoiceId: string;
}

function withInvoicingGate(node: ReactNode) {
  return (
    <FeatureGate feature={Feature.INVOICING} showLockedCard>
      {node}
    </FeatureGate>
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
    totalAmount,
    router,
  } = useInvoiceEditLogic(invoiceId);

  if (isLoading) {
    return withInvoicingGate(<LoadingState message="Loading invoice…" />);
  }

  if (!invoice) {
    return withInvoicingGate(
      <EmptyState
        icon={FileText}
        title="Invoice not found"
        description="The invoice you are looking for does not exist"
        action={{
          label: "Back to Invoices",
          onClick: () => router.push("/invoices"),
        }}
      />,
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

          <InvoiceEditLineItemsSection
            control={form.control}
            setValue={form.setValue}
            fields={fields}
            append={append}
            remove={remove}
            totalAmount={totalAmount}
          />

          <InvoiceEditNotesSection control={form.control} />

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={goBack}>
              Cancel
            </Button>
            <Button type="submit">
              <Save className="h-4 w-4 mr-2" />
              Update Invoice
            </Button>
          </div>
        </form>
      </Form>
    </div>,
  );
};
