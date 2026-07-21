// check-as-cast-density: allow-file — React Hook Form generics and unknown-to-typed property access require as casts
"use client";

// jscpd:ignore-start
import type { ReactNode } from "react";
import { useWatch, type ArrayPath, type Control, type FieldArrayWithId, type FieldValues, type Path, type UseFieldArrayAppend, type UseFieldArrayRemove, type UseFormSetValue, } from "react-hook-form";
import { useTranslations } from "next-intl";
import type { InvoiceLineItemFormValues } from "@workspace/types";
import { FormControl, FormField, FormItem, FormLabel, FormMessage, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea } from "@workspace/ui/components/form/form-primitives"
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components";
import { Plus } from "lucide-react";
import { InvoiceItemsTable } from "./InvoiceItemsTable";
import { InvoiceSubtotal } from "./InvoiceSubtotal";
import { formatCurrency } from "@workspace/utils";

/**
 * Phase 3 (per-feature): apps/app Invoices > form sections
 * (details/line items/status/notes shared form sections). 9 literals
 * converted to useTranslations("Invoices.formSections").
 */
function useInvoiceFormSectionsTranslations() {
  return useTranslations("Invoices.formSections");
}

export function InvoiceDetailsCard({ children }: { children: ReactNode }) {
// jscpd:ignore-end
  const t = useInvoiceFormSectionsTranslations();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("invoiceDetailsTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="grid md:grid-cols-2 gap-6">{children}</CardContent>
    </Card>
  );
}

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
  const t = useInvoiceFormSectionsTranslations();
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t("lineItemsTitle")}</CardTitle>
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
          {t("addItemButton")}
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

export function InvoiceStatusField<TFieldValues extends FieldValues>({
  control,
}: {
  control: Control<TFieldValues>;
}) {
  const t = useInvoiceFormSectionsTranslations();
  return (
    <FormField
      control={control}
      name={"status" as Path<TFieldValues>}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t("statusLabel")}</FormLabel>
          <Select
            onValueChange={field.onChange}
            value={(field.value as string | undefined) ?? ""}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder={t("statusPlaceholder")} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value="PENDING">{t("statusPending")}</SelectItem>
              <SelectItem value="PAID">{t("statusPaid")}</SelectItem>
              <SelectItem value="OVERDUE">{t("statusOverdue")}</SelectItem>
              <SelectItem value="CANCELLED">{t("statusCancelled")}</SelectItem>
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function InvoiceLineItemsSectionContainer<
  TFieldValues extends FieldValues,
>({
  control,
  setValue,
  fields,
  append,
  remove,
  totalAmount,
  buildFieldPath,
}: {
  control: Control<TFieldValues>;
  setValue: UseFormSetValue<TFieldValues>;
  fields: FieldArrayWithId<TFieldValues, ArrayPath<TFieldValues>>[];
  append: UseFieldArrayAppend<TFieldValues, ArrayPath<TFieldValues>>;
  remove: UseFieldArrayRemove;
  totalAmount: number;
  buildFieldPath: (index: number, fieldName: string) => string;
}) {
  const watchedItems =
    useWatch({
      control,
      name: "items" as unknown as Path<TFieldValues>,
    }) ?? [];
  const computedItems = computeInvoiceItems(fields, watchedItems as unknown[]);
  const onUpdateItem = buildInvoiceItemUpdateHandler(
    (path, value) => setValue(path as Path<TFieldValues>, value as never),
    buildFieldPath,
  );

  return (
    <InvoiceLineItemsSection
      items={computedItems}
      onUpdateItem={onUpdateItem}
      onRemoveItem={remove}
      onAddItem={() => append(EMPTY_INVOICE_ITEM as never)}
      totalAmount={totalAmount}
      control={control}
    />
  );
}

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
  const t = useInvoiceFormSectionsTranslations();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("notesTitle")}</CardTitle>
        <CardDescription>
          {t("notesDescription")}
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
                  placeholder={t("notesPlaceholder")}
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
