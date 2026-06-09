import { Button } from "@workspace/ui/components/form/button";
import { Input } from "@workspace/ui/components/form/input";
import { Label } from "@workspace/ui/components/form/label";
import type { OCRFormData, OCRInvoiceLineForm } from "@/features/ocr/types";

/** Subtotal / tax / grand-total fields for the OCR invoice draft. */
export function OCRInvoiceTotalsFields({
  invoice,
  onChange,
}: {
  invoice: OCRFormData["invoice"];
  onChange: (patch: Partial<OCRFormData["invoice"]>) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div className="space-y-2">
        <Label className="text-xs">Subtotal</Label>
        <Input
          value={invoice.subtotal}
          onChange={(e) => onChange({ subtotal: e.target.value })}
          placeholder="Enter subtotal"
          disabled={!invoice.saveAsPending}
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs">Tax</Label>
        <Input
          value={invoice.taxTotal}
          onChange={(e) => onChange({ taxTotal: e.target.value })}
          placeholder="Enter tax"
          disabled={!invoice.saveAsPending}
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs">Grand total</Label>
        <Input
          value={invoice.grandTotal}
          onChange={(e) => onChange({ grandTotal: e.target.value })}
          placeholder="Enter grand total"
          disabled={!invoice.saveAsPending}
        />
      </div>
    </div>
  );
}

/** A single editable invoice-line row with a remove action. */
function OCRInvoiceLineRow({
  row,
  index,
  canRemove,
  disabled,
  onPatch,
  onRemove,
}: {
  row: OCRInvoiceLineForm;
  index: number;
  canRemove: boolean;
  disabled: boolean;
  onPatch: (index: number, patch: Partial<OCRInvoiceLineForm>) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="grid gap-2 rounded-md border border-border bg-background p-2 sm:grid-cols-12">
      <div className="sm:col-span-5">
        <Input
          value={row.description}
          onChange={(e) => onPatch(index, { description: e.target.value })}
          placeholder="Enter description"
          disabled={disabled}
        />
      </div>
      <div className="sm:col-span-2">
        <Input
          value={row.quantity}
          onChange={(e) => onPatch(index, { quantity: e.target.value })}
          placeholder="Enter quantity"
          disabled={disabled}
        />
      </div>
      <div className="sm:col-span-2">
        <Input
          value={row.unitPrice}
          onChange={(e) => onPatch(index, { unitPrice: e.target.value })}
          placeholder="Enter unit price"
          disabled={disabled}
        />
      </div>
      <div className="sm:col-span-2">
        <Input
          value={row.total}
          onChange={(e) => onPatch(index, { total: e.target.value })}
          placeholder="Enter line total"
          disabled={disabled}
        />
      </div>
      <div className="flex items-center justify-end sm:col-span-1">
        {canRemove ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => onRemove(index)}
            disabled={disabled}
          >
            Remove
          </Button>
        ) : null}
      </div>
    </div>
  );
}

/** Editable line-items list plus the "Add line item" action. */
export function OCRInvoiceLineItemsEditor({
  rows,
  hasStoredItems,
  disabled,
  onPatchRow,
  onRemoveRow,
  onAddRow,
}: {
  rows: OCRInvoiceLineForm[];
  hasStoredItems: boolean;
  disabled: boolean;
  onPatchRow: (index: number, patch: Partial<OCRInvoiceLineForm>) => void;
  onRemoveRow: (index: number) => void;
  onAddRow: () => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs">Line items</Label>
      <div className="space-y-3">
        {rows.map((row, idx) => (
          <OCRInvoiceLineRow
            key={`line-${idx}`}
            row={row}
            index={idx}
            canRemove={hasStoredItems}
            disabled={disabled}
            onPatch={onPatchRow}
            onRemove={onRemoveRow}
          />
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-1"
        onClick={onAddRow}
        disabled={disabled}
      >
        Add line item
      </Button>
    </div>
  );
}
