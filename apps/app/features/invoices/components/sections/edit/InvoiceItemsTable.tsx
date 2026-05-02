"use client";

import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Button } from "@workspace/ui/components/button";
import { SymbolTooltip } from "@workspace/ui/components/tooltip";
import { Input } from "@workspace/ui/components/input";
import { Trash2 } from "lucide-react";

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface InvoiceItemsTableProps {
  items: InvoiceItem[];
  onUpdateItem: (index: number, field: string, value: string | number) => void;
  onRemoveItem: (index: number) => void;
  formatCurrency: (amount: number) => string;
}

export function InvoiceItemsTable({
  items,
  onUpdateItem,
  onRemoveItem,
  formatCurrency,
}: InvoiceItemsTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40%]">Description</TableHead>
            <TableHead className="w-[15%]">Qty</TableHead>
            <TableHead className="w-[20%]">Unit Price</TableHead>
            <TableHead className="w-[20%]">Total</TableHead>
            <TableHead className="w-[5%]"></TableHead>
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
                  placeholder="Item description"
                />
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) =>
                    onUpdateItem(index, "quantity", parseFloat(e.target.value))
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
                    onUpdateItem(index, "unitPrice", parseFloat(e.target.value))
                  }
                />
              </TableCell>
              <TableCell className="font-medium">
                {formatCurrency(item.total)}
              </TableCell>
              <TableCell>
                <SymbolTooltip label="Remove line item">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive/90"
                    onClick={() => onRemoveItem(index)}
                    aria-label="Remove line item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </SymbolTooltip>
              </TableCell>
            </TableRow>
          ))}
          {items.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={5}
                className="text-center py-8 text-muted-foreground"
              >
                No items added. Click &quot;Add Item&quot; to start.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
