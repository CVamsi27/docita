"use client";

import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/data-display/table";
import { Button } from "@workspace/ui/components/form/button";
import { SymbolTooltip } from "@workspace/ui/components/overlay/tooltip";
import { Input } from "@workspace/ui/components/form/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import { Trash2 } from "lucide-react";

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxTreatment: string;
  taxRate: number;
  hsnCode?: string;
  sacCode?: string;
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
    <div className="rounded-md border overflow-x-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[220px]">Description</TableHead>
            <TableHead className="w-24">Qty</TableHead>
            <TableHead className="w-32">Unit Price</TableHead>
            <TableHead className="min-w-[170px]">Tax</TableHead>
            <TableHead className="w-28">GST %</TableHead>
            <TableHead className="w-32">HSN/SAC</TableHead>
            <TableHead className="w-32">Total</TableHead>
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
                      Healthcare exempt
                    </SelectItem>
                    <SelectItem value="TAXABLE">Taxable</SelectItem>
                    <SelectItem value="EXEMPT">Exempt</SelectItem>
                    <SelectItem value="NON_GST">Non-GST</SelectItem>
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
                  placeholder="HSN code"
                />
              </TableCell>
              <TableCell className="font-medium">
                {formatCurrency(item.total)}
              </TableCell>
              <TableCell>
                <SymbolTooltip
                  label={`Remove ${item.description || "line item"}`}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${item.description || "line item"}`}
                    className="text-destructive hover:text-destructive/90"
                    onClick={() => onRemoveItem(index)}
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
                colSpan={8}
                className="text-center py-8 text-muted-foreground"
              >
                No items added yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
