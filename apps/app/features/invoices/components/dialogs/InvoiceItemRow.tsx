import {
  Button,
  Input,
  SymbolTooltip
} from "@workspace/ui/components";
import { X } from "lucide-react";
import type { InvoiceItem } from "@workspace/types";
import type { EditableInvoiceItemField } from "./edit-invoice-dialog-state";

interface InvoiceItemRowProps {
  item: InvoiceItem;
  index: number;
  onUpdate: (index: number, field: EditableInvoiceItemField, value: string | number) => void;
  onRemove: (index: number) => void;
}

export function InvoiceItemRow({ item, index, onUpdate, onRemove }: InvoiceItemRowProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 border rounded-lg bg-muted/30">
      <div className="flex-1">
        <Input
          placeholder="Description"
          value={item.description}
          onChange={(e) => onUpdate(index, "description", e.target.value)}
        />
      </div>
      <div className="flex gap-2 sm:contents">
        <div className="flex-1 sm:w-20 sm:flex-none">
          <Input
            type="number"
            min="1"
            placeholder="Qty"
            value={item.quantity}
            onChange={(e) => onUpdate(index, "quantity", parseInt(e.target.value) || 1)}
          />
        </div>
        <div className="flex-1 sm:w-28 sm:flex-none">
          <Input
            type="number"
            min="0"
            step="0.01"
            placeholder="Price"
            value={item.price}
            onChange={(e) => onUpdate(index, "price", parseFloat(e.target.value) || 0)}
          />
        </div>
        <SymbolTooltip label="Remove line item">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onRemove(index)}
            className="text-destructive hover:text-destructive shrink-0"
            aria-label="Remove line item"
          >
            <X className="h-4 w-4" />
          </Button>
        </SymbolTooltip>
      </div>
    </div>
  );
}
