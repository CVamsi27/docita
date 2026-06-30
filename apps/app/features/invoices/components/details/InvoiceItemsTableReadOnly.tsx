"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/data-display/table";

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

export function InvoiceItemsTableReadOnly({
  items,
  formatCurrency,
}: InvoiceItemsTableReadOnlyProps) {
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
                {item.quantity} × {formatCurrency(unit)}
                {taxRate > 0 ? ` · GST ${taxRate}%` : ""}
                {hsnSac ? ` · HSN ${hsnSac}` : ""}
              </p>
            </div>
          );
        })}
      </div>

      <div className="hidden overflow-hidden rounded-lg border md:block">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="px-4 py-3">Description</TableHead>
              <TableHead className="w-24 px-4 py-3 text-center">Qty</TableHead>
              <TableHead className="w-32 px-4 py-3 text-right">Price</TableHead>
              <TableHead className="w-24 px-4 py-3 text-right">GST</TableHead>
              <TableHead className="w-28 px-4 py-3 text-right">
                HSN/SAC
              </TableHead>
              <TableHead className="w-32 px-4 py-3 text-right">Total</TableHead>
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
                  {item.taxRate ?? 0}%
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
