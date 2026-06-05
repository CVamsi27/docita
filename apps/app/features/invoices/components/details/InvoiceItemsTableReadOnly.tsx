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

  if (rows.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <div className="space-y-3 md:hidden">
        {rows.map((item, index) => {
          const unit = item.unitPrice ?? item.price;
          const total = item.lineTotal ?? item.quantity * unit;
          return (
            <div key={index} className="ui-card-surface space-y-2 p-4 text-sm">
              <p className="font-medium">{item.description}</p>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-muted-foreground">
                <dt>Qty</dt>
                <dd className="text-foreground">{item.quantity}</dd>
                <dt>Unit price</dt>
                <dd className="text-foreground tabular-nums">
                  {formatCurrency(unit)}
                </dd>
                <dt>GST</dt>
                <dd className="text-foreground">{item.taxRate ?? 0}%</dd>
                <dt>HSN/SAC</dt>
                <dd className="text-foreground">
                  {item.hsnCode || item.sacCode || "—"}
                </dd>
              </dl>
              <p className="border-t border-border/60 pt-2 font-medium tabular-nums">
                Total: {formatCurrency(total)}
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
