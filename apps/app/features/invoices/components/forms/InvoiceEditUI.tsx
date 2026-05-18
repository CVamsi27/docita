"use client";

import { FC } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Button } from "@workspace/ui/components/form/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form/form";
import { Textarea } from "@workspace/ui/components/form/textarea";
import { FileText, Plus, Save } from "lucide-react";
import type { Path } from "react-hook-form";
import {
  type InvoiceFormValues,
  useInvoiceEditLogic,
} from "@/features/invoices/hooks/use-invoice-edit-logic";
import { BackButton } from "@/components/navigation/back-button";
import { useBackNavigation } from "@/hooks/use-back-navigation";
import { EmptyState, LoadingState } from "@workspace/ui/components/feedback/empty-state";
import { InvoiceItemsTable } from "./InvoiceItemsTable";
import { InvoiceSubtotal } from "./InvoiceSubtotal";
import { formatCurrency } from "@workspace/utils";

interface InvoiceEditUIProps {
  invoiceId: string;
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
    return <LoadingState message="Loading invoice…" />;
  }

  if (!invoice) {
    return (
      <EmptyState
        icon={FileText}
        title="Invoice not found"
        description="The invoice you are looking for does not exist"
        action={{
          label: "Back to Invoices",
          onClick: () => router.push("/invoices"),
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <BackButton fallback={invoiceFallback} label="Cancel" />
        <div>
          <h1 className="ui-page-title">Edit Invoice</h1>
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
          <Card>
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="PAID">Paid</SelectItem>
                        <SelectItem value="OVERDUE">Overdue</SelectItem>
                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Line Items</CardTitle>
            </CardHeader>
            <CardContent>
              <InvoiceItemsTable
                items={fields.map((field, index) => ({
                  id: field.id,
                  description: form.watch(`items.${index}.description`),
                  quantity: form.watch(`items.${index}.quantity`) || 0,
                  unitPrice: form.watch(`items.${index}.price`) || 0,
                  taxTreatment:
                    form.watch(`items.${index}.taxTreatment`) ||
                    "EXEMPT_HEALTHCARE",
                  taxRate: form.watch(`items.${index}.taxRate`) || 0,
                  hsnCode: form.watch(`items.${index}.hsnCode`) || "",
                  sacCode: form.watch(`items.${index}.sacCode`) || "",
                  total:
                    (form.watch(`items.${index}.quantity`) || 0) *
                      (form.watch(`items.${index}.price`) || 0) +
                    ((form.watch(`items.${index}.taxTreatment`) === "TAXABLE"
                      ? form.watch(`items.${index}.taxRate`) || 0
                      : 0) /
                      100) *
                      ((form.watch(`items.${index}.quantity`) || 0) *
                        (form.watch(`items.${index}.price`) || 0)),
                }))}
                onUpdateItem={(index, key, value) => {
                  const fieldName = key === "unitPrice" ? "price" : key;
                  form.setValue(
                    `items.${index}.${fieldName}` as Path<InvoiceFormValues>,
                    value,
                  );
                  if (key === "taxTreatment" && value !== "TAXABLE") {
                    form.setValue(
                      `items.${index}.taxRate` as Path<InvoiceFormValues>,
                      0,
                    );
                  }
                }}
                onRemoveItem={remove}
                formatCurrency={formatCurrency}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({
                    description: "",
                    quantity: 1,
                    price: 0,
                    taxTreatment: "EXEMPT_HEALTHCARE",
                    taxRate: 0,
                  })
                }
                className="mt-4"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>

              <InvoiceSubtotal
                control={form.control}
                totalAmount={totalAmount}
                formatCurrency={formatCurrency}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
              <CardDescription>
                Add any additional notes or payment instructions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder="Notes"
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

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
    </div>
  );
};
