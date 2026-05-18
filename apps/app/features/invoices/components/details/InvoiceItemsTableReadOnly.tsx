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
  return (
    <div className="rounded-lg border overflow-hidden mb-6">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="py-3 px-4">Description</TableHead>
            <TableHead className="py-3 px-4 text-center w-24">Qty</TableHead>
            <TableHead className="py-3 px-4 text-right w-32">Price</TableHead>
            <TableHead className="py-3 px-4 text-right w-24">GST</TableHead>
            <TableHead className="py-3 px-4 text-right w-28">HSN/SAC</TableHead>
            <TableHead className="py-3 px-4 text-right w-32">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y">
          {(items || []).map((item, index: number) => (
            <TableRow key={index}>
              <TableCell className="py-3 px-4">{item.description}</TableCell>
              <TableCell className="py-3 px-4 text-center">
                {item.quantity}
              </TableCell>
              <TableCell className="py-3 px-4 text-right">
                {formatCurrency(item.unitPrice ?? item.price)}
              </TableCell>
              <TableCell className="py-3 px-4 text-right">
                {item.taxRate ?? 0}%
              </TableCell>
              <TableCell className="py-3 px-4 text-right">
                {item.hsnCode || item.sacCode || "-"}
              </TableCell>
              <TableCell className="py-3 px-4 text-right font-medium">
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
  );
}
