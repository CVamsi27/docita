"use client";

import { useWatch, type Control, type UseFormSetValue, type UseFieldArrayAppend, type UseFieldArrayRemove, type FieldArrayWithId } from "react-hook-form";
import type { InvoiceEditFormValues } from "@workspace/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form/form";
import { editInvoiceItemFieldPath } from "@/features/invoices/lib/invoice-form-paths";
import {
  InvoiceLineItemsSection,
  InvoiceNotesSection,
  computeInvoiceItems,
  buildInvoiceItemUpdateHandler,
  EMPTY_INVOICE_ITEM,
} from "./invoice-form-sections-shared";

export function InvoiceEditDetailsSection({
  control,
}: {
  control: Control<InvoiceEditFormValues>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoice details</CardTitle>
      </CardHeader>
      <CardContent className="grid md:grid-cols-2 gap-6">
        <FormField
          control={control}
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
  );
}

export function InvoiceEditLineItemsSection({
  control,
  setValue,
  fields,
  append,
  remove,
  totalAmount,
}: {
  control: Control<InvoiceEditFormValues>;
  setValue: UseFormSetValue<InvoiceEditFormValues>;
  fields: FieldArrayWithId<InvoiceEditFormValues, "items">[];
  append: UseFieldArrayAppend<InvoiceEditFormValues, "items">;
  remove: UseFieldArrayRemove;
  totalAmount: number;
}) {
  const watchedItems = useWatch({ control, name: "items" }) || [];
  const computedItems = computeInvoiceItems(fields, watchedItems);
  const onUpdateItem = buildInvoiceItemUpdateHandler(
    (path, value) => setValue(path as never, value as never),
    editInvoiceItemFieldPath,
  );

  return (
    <InvoiceLineItemsSection
      items={computedItems}
      onUpdateItem={onUpdateItem}
      onRemoveItem={remove}
      onAddItem={() => append(EMPTY_INVOICE_ITEM)}
      totalAmount={totalAmount}
      control={control}
    />
  );
}

export function InvoiceEditNotesSection({
  control,
}: {
  control: Control<InvoiceEditFormValues>;
}) {
  return <InvoiceNotesSection control={control} />;
}
