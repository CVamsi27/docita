// check-as-cast-density: allow-file — react-hook-form generics and path
// composition require as-casts at this boundary (same pattern as the
// Next.js source this feature was ported from).
import type { ReactNode } from "react";
import {
  useWatch,
  type ArrayPath,
  type Control,
  type FieldArrayWithId,
  type FieldValues,
  type Path,
  type UseFieldArrayAppend,
  type UseFieldArrayRemove,
  type UseFormSetValue,
} from "react-hook-form";
import { useTranslation } from "react-i18next";
import { buildInvoiceItemUpdateHandler, computeInvoiceItems, EMPTY_INVOICE_ITEM } from "./invoice-form-items-helpers";
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
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import { Textarea } from "@workspace/ui/components/form/textarea";
import { Plus } from "lucide-react";
import { InvoiceItemsTable } from "./InvoiceItemsTable";
import { InvoiceSubtotal } from "./InvoiceSubtotal";
import { formatCurrency } from "@workspace/utils";

export function InvoiceDetailsCard({ children }: { children: ReactNode }) {
  const { t } = useTranslation("Invoices");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("formSections.invoiceDetailsTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="grid md:grid-cols-2 gap-6">{children}</CardContent>
    </Card>
  );
}

function InvoiceLineItemsSection({
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
  const { t } = useTranslation("Invoices");
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t("formSections.lineItemsTitle")}</CardTitle>
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
          {t("formSections.addItemButton")}
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

export function InvoiceStatusField<TFieldValues extends FieldValues>({
  control,
}: {
  control: Control<TFieldValues>;
}) {
  const { t } = useTranslation("Invoices");
  return (
    <FormField
      control={control}
      name={"status" as Path<TFieldValues>}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t("formSections.statusLabel")}</FormLabel>
          <Select
            onValueChange={field.onChange}
            value={(field.value as string | undefined) ?? ""}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder={t("formSections.statusPlaceholder")} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value="PENDING">{t("formSections.statusPending")}</SelectItem>
              <SelectItem value="PAID">{t("formSections.statusPaid")}</SelectItem>
              <SelectItem value="OVERDUE">{t("formSections.statusOverdue")}</SelectItem>
              <SelectItem value="CANCELLED">{t("formSections.statusCancelled")}</SelectItem>
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

export function InvoiceNotesSection({
  control,
}: {
  control: unknown;
}) {
  const { t } = useTranslation("Invoices");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("formSections.notesTitle")}</CardTitle>
        <CardDescription>
          {t("formSections.notesDescription")}
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
                  placeholder={t("formSections.notesPlaceholder")}
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
