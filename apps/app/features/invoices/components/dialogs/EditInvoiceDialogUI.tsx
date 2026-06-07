// jscpd:ignore-start
import { CRUDDialog } from "@workspace/ui/components/overlay/crud-dialog";
import { Button } from "@workspace/ui/components/form/button";
import { SymbolTooltip } from "@workspace/ui/components/overlay/tooltip";
import { Label } from "@workspace/ui/components/form/label";
import { Input } from "@workspace/ui/components/form/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import { Plus, X } from "lucide-react";
import type { InvoiceItem } from "@workspace/types";
import { useClinicCurrency } from "@/hooks/use-clinic-currency";
import type { EditableInvoiceItemField } from "./edit-invoice-dialog-state";

export interface EditInvoiceDialogUIProps {
  open: boolean;
  patientName: string;
  items: InvoiceItem[];
  status: string;
  loading: boolean;
  statusOptions: Array<{ value: string; label: string }>;
  onOpenChange: (open: boolean) => void;
  onStatusChange: (status: string) => void;
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
  onUpdateItem: (
    index: number,
    field: EditableInvoiceItemField,
    value: string | number,
  ) => void;
  onSubmit: () => void;
  calculateTotal: () => number;
}

export function EditInvoiceDialogUI({
  open,
  patientName,
  items,
  status,
  loading,
  statusOptions,
  onOpenChange,
  onStatusChange,
  onAddItem,
  onRemoveItem,
  onUpdateItem,
  onSubmit,
  calculateTotal,
}: EditInvoiceDialogUIProps) {
  const { formatCurrency } = useClinicCurrency();

  return (
    <CRUDDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Edit invoice"
      description={`Update invoice details for ${patientName}`}
      isLoading={loading}
      onSubmit={onSubmit}
      submitLabel={loading ? "Saving…" : "Save changes"}
      contentClassName="max-w-6xl max-h-[90vh] overflow-y-auto"
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={status} onValueChange={onStatusChange}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Invoice items</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onAddItem}
            >
              <Plus className="h-4 w-4 mr-1" /> Add Item
            </Button>
          </div>

          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {items.map((item, index) => (
              <div
                key={index}
                className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 border rounded-lg bg-muted/30"
              >
                <div className="flex-1">
                  <Input
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) =>
                      onUpdateItem(index, "description", e.target.value)
                    }
                  />
                </div>
                <div className="flex gap-2 sm:contents">
                  <div className="flex-1 sm:w-20 sm:flex-none">
                    <Input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) =>
                        onUpdateItem(
                          index,
                          "quantity",
                          parseInt(e.target.value) || 1,
                        )
                      }
                    />
                  </div>
                  <div className="flex-1 sm:w-28 sm:flex-none">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Price"
                      value={item.price}
                      onChange={(e) =>
                        onUpdateItem(
                          index,
                          "price",
                          parseFloat(e.target.value) || 0,
                        )
                      }
                    />
                  </div>
                  <SymbolTooltip label="Remove line item">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveItem(index)}
                      className="text-destructive hover:text-destructive shrink-0"
                      aria-label="Remove line item"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </SymbolTooltip>
                </div>
              </div>
            ))}
            {items.length === 0 && (
              <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                No items. Click &quot;Add Item&quot; to add one.
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-4 p-4 bg-muted/30 rounded-lg">
          <span className="text-lg font-medium">Total:</span>
          <span className="ui-section-title text-[var(--fs-2xl)] text-primary tabular-nums">
            {formatCurrency(calculateTotal())}
// jscpd:ignore-end
          </span>
        </div>
      </div>
    </CRUDDialog>
  );
}
