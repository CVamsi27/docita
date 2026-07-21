"use client";

import {
  Button,
  Input,
  SymbolTooltip
} from "@workspace/ui/components";
import { Plus, X } from "lucide-react";
import type { LineItem } from "./billing-modal-types";

interface BillingLineItemsEditorProps {
  items: LineItem[];
  updateItem: (
    index: number,
    field: keyof LineItem,
    value: string | number,
  ) => void;
  removeItem: (index: number) => void;
  addItem: () => void;
}

export function BillingLineItemsEditor({
  items,
  updateItem,
  removeItem,
  addItem,
}: BillingLineItemsEditorProps) {
  return (
    <div className="space-y-3 bg-muted/20 p-4 rounded-lg">
      <div className="hidden sm:grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
        <div className="col-span-5">Description</div>
        <div className="col-span-2">Qty</div>
        <div className="col-span-4">Unit Price</div>
        <div className="col-span-1"></div>
      </div>

      {items.map((item, index) => (
        <div
          key={index}
          className="flex flex-col gap-2 sm:grid sm:grid-cols-12 sm:items-center"
        >
          <div className="sm:col-span-5">
            <Input
              placeholder="Item description"
              value={item.description}
              onChange={(e) => updateItem(index, "description", e.target.value)}
              className="h-9"
            />
          </div>
          <div className="flex gap-2 sm:contents">
            <div className="flex-1 sm:col-span-2">
              <Input
                type="number"
                min="1"
                placeholder="Qty"
                value={item.quantity}
                onChange={(e) =>
                  updateItem(index, "quantity", parseInt(e.target.value) || 1)
                }
                className="h-9"
              />
            </div>
            <div className="flex-1 sm:col-span-4">
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="Unit price"
                value={item.price}
                onChange={(e) =>
                  updateItem(index, "price", parseFloat(e.target.value) || 0)
                }
                className="h-9"
              />
            </div>
            <div className="sm:col-span-1 flex items-center justify-center">
              {items.length > 1 && (
                <SymbolTooltip label="Remove line item">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => removeItem(index)}
                    aria-label="Remove line item"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </SymbolTooltip>
              )}
            </div>
          </div>
        </div>
      ))}

      <Button
        variant="outline"
        size="sm"
        onClick={addItem}
        className="w-full border-dashed mt-2"
      >
        <Plus className="mr-2 h-3.5 w-3.5" />
        Add Item
      </Button>
    </div>
  );
}
