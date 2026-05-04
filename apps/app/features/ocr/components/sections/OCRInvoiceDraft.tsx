import { Receipt } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { SectionToggle } from "@/features/ocr/components/common/section-toggle";
import type { OCRFormData, OCRInvoiceLineForm } from "@/features/ocr/types";

interface OCRInvoiceDraftProps {
  formData: OCRFormData;
  setFormData: (data: OCRFormData) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const emptyLine = (): OCRInvoiceLineForm => ({
  description: "",
  quantity: "",
  unitPrice: "",
  total: "",
});

export const OCRInvoiceDraft = ({
  formData,
  setFormData,
  isOpen,
  onToggle,
}: OCRInvoiceDraftProps) => {
  const { invoice } = formData;
  const lineCount = invoice.items.length;
  const badge =
    lineCount > 0 || invoice.grandTotal.trim().length > 0
      ? String(Math.max(lineCount, 1))
      : undefined;

  const rows: OCRInvoiceLineForm[] =
    invoice.items.length > 0 ? invoice.items : [emptyLine()];

  const updateInvoice = (patch: Partial<OCRFormData["invoice"]>) => {
    setFormData({
      ...formData,
      invoice: { ...formData.invoice, ...patch },
    });
  };

  const patchRowAt = (index: number, patch: Partial<OCRInvoiceLineForm>) => {
    const row = rows[index];
    if (!row) return;
    const nextRow = { ...row, ...patch };
    if (invoice.items.length === 0) {
      updateInvoice({ items: [nextRow] });
      return;
    }
    const next = [...invoice.items];
    next[index] = { ...next[index], ...patch };
    updateInvoice({ items: next });
  };

  const addLine = () => {
    if (invoice.items.length === 0) {
      updateInvoice({ items: [...rows, emptyLine()] });
      return;
    }
    updateInvoice({ items: [...invoice.items, emptyLine()] });
  };

  const removeLine = (index: number) => {
    if (invoice.items.length === 0) {
      updateInvoice({ items: [] });
      return;
    }
    const next = invoice.items.filter((_, i) => i !== index);
    updateInvoice({ items: next });
  };

  return (
    <div className="space-y-3">
      <SectionToggle
        title="Invoice (optional)"
        icon={Receipt}
        isOpen={isOpen}
        onToggle={onToggle}
        {...(badge ? { badge } : {})}
      />
      {isOpen && (
        <div className="space-y-4 bg-muted/30 rounded-lg p-3">
          <p className="text-xs text-muted-foreground leading-snug">
            When you opt in, we create a pending invoice linked to this visit.
            Review amounts before saving.
          </p>
          <div className="flex items-start gap-3">
            <Checkbox
              id="ocr-invoice-pending"
              checked={invoice.saveAsPending}
              onCheckedChange={(v) =>
                updateInvoice({ saveAsPending: v === true })
              }
              className="mt-0.5"
            />
            <Label
              htmlFor="ocr-invoice-pending"
              className="text-sm font-normal leading-snug cursor-pointer"
            >
              Save as pending invoice with this patient and visit
            </Label>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-xs">Subtotal</Label>
              <Input
                value={invoice.subtotal}
                onChange={(e) => updateInvoice({ subtotal: e.target.value })}
                placeholder="Enter subtotal"
                disabled={!invoice.saveAsPending}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Tax</Label>
              <Input
                value={invoice.taxTotal}
                onChange={(e) => updateInvoice({ taxTotal: e.target.value })}
                placeholder="Enter tax"
                disabled={!invoice.saveAsPending}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Grand total</Label>
              <Input
                value={invoice.grandTotal}
                onChange={(e) => updateInvoice({ grandTotal: e.target.value })}
                placeholder="Enter grand total"
                disabled={!invoice.saveAsPending}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Line items</Label>
            <div className="space-y-3">
              {rows.map((row, idx) => (
                <div
                  key={`line-${idx}`}
                  className="grid gap-2 rounded-md border border-border bg-background p-2 sm:grid-cols-12"
                >
                  <div className="sm:col-span-5">
                    <Input
                      value={row.description}
                      onChange={(e) =>
                        patchRowAt(idx, { description: e.target.value })
                      }
                      placeholder="Enter description"
                      disabled={!invoice.saveAsPending}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Input
                      value={row.quantity}
                      onChange={(e) =>
                        patchRowAt(idx, { quantity: e.target.value })
                      }
                      placeholder="Enter quantity"
                      disabled={!invoice.saveAsPending}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Input
                      value={row.unitPrice}
                      onChange={(e) =>
                        patchRowAt(idx, { unitPrice: e.target.value })
                      }
                      placeholder="Enter unit price"
                      disabled={!invoice.saveAsPending}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Input
                      value={row.total}
                      onChange={(e) =>
                        patchRowAt(idx, { total: e.target.value })
                      }
                      placeholder="Enter line total"
                      disabled={!invoice.saveAsPending}
                    />
                  </div>
                  <div className="flex items-center justify-end sm:col-span-1">
                    {invoice.items.length > 0 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={() => removeLine(idx)}
                        disabled={!invoice.saveAsPending}
                      >
                        Remove
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-1"
              onClick={addLine}
              disabled={!invoice.saveAsPending}
            >
              Add line item
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
