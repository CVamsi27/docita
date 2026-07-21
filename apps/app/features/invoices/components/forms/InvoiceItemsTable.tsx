"use client";

import { useTranslations } from "next-intl";
import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/form/form-primitives";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components";
import { InvoiceItemCard, type InvoiceItem } from "./InvoiceItemsTableSections";
import { InvoiceItemRemoveButton } from "./invoice-item-remove-button";

interface InvoiceItemsTableProps {
  items: InvoiceItem[];
  onUpdateItem: (index: number, field: string, value: string | number) => void;
  onRemoveItem: (index: number) => void;
  formatCurrency: (amount: number) => string;
}

/**
 * Phase 3 (per-feature): apps/app invoice items table — the
 * line-item editor on the invoice create/edit page. 10
 * literals converted to useTranslations("Invoices.itemsTable").
 */
function useInvoiceItemsTableTranslations() {
  return useTranslations("Invoices.itemsTable");
}

export function InvoiceItemsTable({
  items,
  onUpdateItem,
  onRemoveItem,
  formatCurrency,
}: InvoiceItemsTableProps) {
  const t = useInvoiceItemsTableTranslations();
  if (items.length === 0) return (
      <div className="rounded-md border px-4 py-8 text-center text-muted-foreground">
        {t("emptyMessage")}
      </div>
    );

  return (
    <>
      <div className="space-y-3 md:hidden">
        {items.map((item, index) => (
          <InvoiceItemCard
            key={item.id}
            item={item}
            index={index}
            onUpdateItem={onUpdateItem}
            onRemoveItem={onRemoveItem}
            formatCurrency={formatCurrency}
          />
        ))}
      </div>

      <div className="hidden overflow-x-auto overscroll-x-contain rounded-md border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[220px]">{t("colDescription")}</TableHead>
              <TableHead className="w-24">{t("colQty")}</TableHead>
              <TableHead className="w-32">{t("colUnitPrice")}</TableHead>
              <TableHead className="min-w-[170px]">{t("colTax")}</TableHead>
              <TableHead className="w-28">{t("colGstPercent")}</TableHead>
              <TableHead className="w-32">{t("colHsnSac")}</TableHead>
              <TableHead className="w-32">{t("colTotal")}</TableHead>
              <TableHead className="w-[5%]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, index) => (
              <TableRow key={item.id}>
                <TableCell>
                  <Input
                    value={item.description}
                    onChange={(e) =>
                      onUpdateItem(index, "description", e.target.value)
                    }
                    placeholder={t("itemDescriptionPlaceholder")}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) =>
                      onUpdateItem(
                        index,
                        "quantity",
                        parseFloat(e.target.value),
                      )
                    }
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) =>
                      onUpdateItem(
                        index,
                        "unitPrice",
                        parseFloat(e.target.value),
                      )
                    }
                  />
                </TableCell>
                <TableCell>
                  <Select
                    value={item.taxTreatment}
                    onValueChange={(value) =>
                      onUpdateItem(index, "taxTreatment", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EXEMPT_HEALTHCARE">
                        {t("taxHealthcareExempt")}
                      </SelectItem>
                      <SelectItem value="TAXABLE">{t("taxTaxable")}</SelectItem>
                      <SelectItem value="EXEMPT">{t("taxExempt")}</SelectItem>
                      <SelectItem value="NON_GST">{t("taxNonGst")}</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    disabled={item.taxTreatment !== "TAXABLE"}
                    value={item.taxRate}
                    onChange={(e) =>
                      onUpdateItem(index, "taxRate", parseFloat(e.target.value))
                    }
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={item.hsnCode || item.sacCode || ""}
                    onChange={(e) =>
                      onUpdateItem(index, "hsnCode", e.target.value)
                    }
                    placeholder={t("hsnCodePlaceholder")}
                  />
                </TableCell>
                <TableCell className="font-medium">
                  {formatCurrency(item.total)}
                </TableCell>
                <TableCell>
                  <InvoiceItemRemoveButton
                    description={item.description}
                    onClick={() => onRemoveItem(index)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
