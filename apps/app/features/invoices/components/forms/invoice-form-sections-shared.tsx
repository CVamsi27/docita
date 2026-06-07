"use client";

import type { InvoiceLineItemFormValues } from "@workspace/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Button } from "@workspace/ui/components/form/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@workspace/ui/components/form/form";
import { Textarea } from "@workspace/ui/components/form/textarea";
import { Plus } from "lucide-react";
import { InvoiceItemsTable } from "./InvoiceItemsTable";
import { InvoiceSubtotal } from "./InvoiceSubtotal";
import { formatCurrency } from "@workspace/utils";

export function InvoiceLineItemsSection({
  items,
  onUpdateItem,
  onRemoveItem,
  onAddItem,
  totalAmount,
  control,
}: {
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    taxTreatment: string;
    taxRate: number;
    hsnCode: string;
    sacCode: string;
    total: number;
  }>;
  onUpdateItem: (index: number, key: string, value: unknown) => void;
  onRemoveItem: (index: number) => void;
  onAddItem: () => void;
  totalAmount: number;
  control: unknown;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Line items</CardTitle>
      </CardHeader>
      <CardContent>
        <InvoiceItemsTable
          items={items}
          onUpdateItem={onUpdateItem}
          onRemoveItem={onRemoveItem}
          formatCurrency={formatCurrency}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAddItem}
          className="mt-4"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>

        <InvoiceSubtotal
          control={control as never}
          totalAmount={totalAmount}
          formatCurrency={formatCurrency}
        />
      </CardContent>
    </Card>
  );
}

export function computeInvoiceItems(
  fields: Array<{ id: string }>,
  watchedItems: unknown[],
) {
  return fields.map((field, index) => {
    const item = (watchedItems[index] ?? {}) as Record<string, unknown>;
    const quantity = (item.quantity as number) || 0;
    const price = (item.price as number) || 0;
    const taxTreatment = (item.taxTreatment as string) || "EXEMPT_HEALTHCARE";
    const taxRate = (item.taxRate as number) || 0;

    return {
      id: field.id,
      description: (item.description as string) ?? "",
      quantity,
      unitPrice: price,
      taxTreatment,
      taxRate,
      hsnCode: (item.hsnCode as string) ?? "",
      sacCode: (item.sacCode as string) ?? "",
      total:
        quantity * price +
        (taxTreatment === "TAXABLE" ? (taxRate / 100) * quantity * price : 0),
    };
  });
}

export const EMPTY_INVOICE_ITEM: InvoiceLineItemFormValues = {
  description: "",
  quantity: 1,
  price: 0,
  taxTreatment: "EXEMPT_HEALTHCARE",
  taxRate: 0,
};

export function buildInvoiceItemUpdateHandler(
  setValue: (path: string, value: unknown) => void,
  buildFieldPath: (index: number, fieldName: string) => string,
) {
  return (index: number, key: string, value: unknown) => {
    const fieldName = key === "unitPrice" ? "price" : key;
    setValue(buildFieldPath(index, fieldName), value);
    if (key === "taxTreatment" && value !== "TAXABLE") {
      setValue(buildFieldPath(index, "taxRate"), 0);
    }
  };
}

export function InvoiceNotesSection({
  control,
}: {
  control: unknown;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Notes</CardTitle>
        <CardDescription>
          Add any additional notes or payment instructions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FormField
          control={control as never}
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
  );
}
