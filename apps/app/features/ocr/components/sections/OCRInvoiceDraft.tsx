import { Receipt } from "lucide-react";
import { Checkbox } from "@workspace/ui/components/form/checkbox";
import { Label } from "@workspace/ui/components/form/label";
import { SectionToggle } from "@/features/ocr/components/common/section-toggle";
import type { OCRFormData, OCRInvoiceLineForm } from "@/features/ocr/types";
import {
  OCRInvoiceTotalsFields,
  OCRInvoiceLineItemsEditor,
} from "./OCRInvoiceDraft.sections";
import {
  createEmptyInvoiceLine,
  patchInvoiceLineAt,
  addInvoiceLine,
  removeInvoiceLine,
} from "./ocr-invoice-draft-state";

interface OCRInvoiceDraftProps {
  formData: OCRFormData;
  setFormData: (data: OCRFormData) => void;
  isOpen: boolean;
  onToggle: () => void;
}

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
    invoice.items.length > 0 ? invoice.items : [createEmptyInvoiceLine()];

  const updateInvoice = (patch: Partial<OCRFormData["invoice"]>) => {
    setFormData({
      ...formData,
      invoice: { ...formData.invoice, ...patch },
    });
  };
  const patchRowAt = (index: number, patch: Partial<OCRInvoiceLineForm>) => {
    const next = patchInvoiceLineAt(invoice.items, rows, index, patch);
    if (next) updateInvoice({ items: next });
  };
  const addLine = () => updateInvoice({ items: addInvoiceLine(invoice.items, rows) });
  const removeLine = (index: number) =>
    updateInvoice({ items: removeInvoiceLine(invoice.items, index) });

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
              Save pending invoice with this patient and visit
            </Label>
          </div>
          <OCRInvoiceTotalsFields invoice={invoice} onChange={updateInvoice} />
          <OCRInvoiceLineItemsEditor
            rows={rows}
            hasStoredItems={invoice.items.length > 0}
            disabled={!invoice.saveAsPending}
            onPatchRow={patchRowAt}
            onRemoveRow={removeLine}
            onAddRow={addLine}
          />
        </div>
      )}
    </div>
  );
};
