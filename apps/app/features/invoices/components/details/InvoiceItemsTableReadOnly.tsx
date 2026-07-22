"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/data-display/table";
import { useTranslations } from "next-intl";

interface InvoiceItem {
  description: string;
  quantity: number;
  price: number;
  unitPrice?: number;
  taxRate?: number;
  hsnCode?: string;
  sacCode?: string;
  lineTotal?: number;
}

interface InvoiceItemsTableReadOnlyProps {
  items: InvoiceItem[];
  formatCurrency: (amount: number) => string;
}

/**
 * Phase 3 (per-feature): apps/app Invoices > Items table read-only.
 * 6 literals converted to useTranslations("Invoices.itemsTableReadOnly").
 */
function useItemsTableReadOnlyTranslations() {
  return useTranslations("Invoices.itemsTableReadOnly");
}

export function InvoiceItemsTableReadOnly({
  items,
  formatCurrency,
}: InvoiceItemsTableReadOnlyProps) {
  const t = useItemsTableReadOnlyTranslations();
  const rows = items ?? [];

  if (rows.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="space-y-2.5 md:hidden">
        {rows.map((item, index) => {
          const unit = item.unitPrice ?? item.price;
          const total = item.lineTotal ?? item.quantity * unit;
          const taxRate = item.taxRate ?? 0;
          const hsnSac = item.hsnCode || item.sacCode;
          return (
            <div key={index} className="ui-card-surface p-3.5 text-sm">
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 font-medium">{item.description}</p>
                <p className="shrink-0 font-semibold tabular-nums">
                  {formatCurrency(total)}
                </p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("mobileLineMeta", {
                  quantity: item.quantity,
                  unit: formatCurrency(unit),
                  tax: taxRate > 0 ? ` · ${t("gstPercentSuffix", { percent: taxRate })}` : "",
                  hsn: hsnSac ? ` · ${t("hsnSuffix", { code: hsnSac })}` : "",
                })}
              </p>
            </div>
          );
        })}
      </div>

      <div className="hidden overflow-hidden rounded-lg border md:block">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="px-4 py-3">{t("colDescription")}</TableHead>
              <TableHead className="w-24 px-4 py-3 text-center">{t("colQty")}</TableHead>
              <TableHead className="w-32 px-4 py-3 text-right">{t("colPrice")}</TableHead>
              <TableHead className="w-24 px-4 py-3 text-right">{t("colGst")}</TableHead>
              <TableHead className="w-28 px-4 py-3 text-right">
                {t("colHsnSac")}
              </TableHead>
              <TableHead className="w-32 px-4 py-3 text-right">{t("colTotal")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y">
            {rows.map((item, index) => (
              <TableRow key={index}>
                <TableCell className="px-4 py-3">{item.description}</TableCell>
                <TableCell className="px-4 py-3 text-center">
                  {item.quantity}
                </TableCell>
                <TableCell className="px-4 py-3 text-right">
                  {formatCurrency(item.unitPrice ?? item.price)}
                </TableCell>
                <TableCell className="px-4 py-3 text-right">
                  {t("gstValue", { percent: item.taxRate ?? 0 })}
                </TableCell>
                <TableCell className="px-4 py-3 text-right">
                  {item.hsnCode || item.sacCode || "—"}
                </TableCell>
                <TableCell className="px-4 py-3 text-right font-medium">
                  {formatCurrency(
                    item.lineTotal ??
                      item.quantity * (item.unitPrice ?? item.price),
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
