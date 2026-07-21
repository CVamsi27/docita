import {
  Button,
  Label
} from "@workspace/ui/components";
import { Plus } from "lucide-react";
import type { InvoiceItem } from "@workspace/types";
import type { EditableInvoiceItemField } from "./edit-invoice-dialog-state";
import { InvoiceItemRow } from "./InvoiceItemRow";
import { InvoiceTotalSection } from "./InvoiceTotalSection";

interface InvoiceItemsSectionProps {
  items: InvoiceItem[];
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
  onUpdateItem: (
    index: number,
    field: EditableInvoiceItemField,
    value: string | number,
  ) => void;
}

export function InvoiceItemsSection({
  items,
  onAddItem,
  onRemoveItem,
  onUpdateItem,
}: InvoiceItemsSectionProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Invoice items</Label>
        <Button type="button" variant="outline" size="sm" onClick={onAddItem}>
          <Plus className="h-4 w-4 mr-1" /> Add Item
        </Button>
      </div>
      <div className="space-y-3 max-h-[300px] overflow-y-auto">
        {items.map((item, index) => (
          <InvoiceItemRow
            key={index}
            item={item}
            index={index}
            onUpdate={onUpdateItem}
            onRemove={onRemoveItem}
          />
        ))}
        {items.length === 0 && (
          <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
            No items. Click &quot;Add Item&quot; to add one.
          </div>
        )}
      </div>
      <InvoiceTotalSection total={items.reduce((sum, item) => sum + item.quantity * item.price, 0)} />
    </div>
  );
}
