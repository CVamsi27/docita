// check-as-cast-density: allow-file — partial-patch spread over a runtime key requires a single widening cast
import { useTranslations } from "next-intl";
import { Button } from "@workspace/ui/components/form/button";
import { Input } from "@workspace/ui/components/form/input";
import { Label } from "@workspace/ui/components/form/label";
import type { OCRFormData, OCRInvoiceLineForm } from "@/features/ocr/types";

/**
 * Phase 3 (per-feature): apps/app OCR > Invoice Draft
 * sub-form — the subtotal/tax/grand-total fields plus the
 * editable line-items list the user fills in after OCR
 * recognition. 11 literals converted to
 * useTranslations("Ocr.invoiceDraft").
 */
function useOcrInvoiceDraftTranslations() {
  return useTranslations("Ocr.invoiceDraft");
}

/** Subtotal / tax / grand-total fields for the OCR invoice draft. */
export function OCRInvoiceTotalsFields({
  invoice,
  onChange,
}: {
  invoice: OCRFormData["invoice"];
  onChange: (patch: Partial<OCRFormData["invoice"]>) => void;
}) {
  const t = useOcrInvoiceDraftTranslations();
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div className="space-y-2">
        <Label className="text-xs">{t("subtotalLabel")}</Label>
        <Input
          value={invoice.subtotal}
          onChange={(e) => onChange({ subtotal: e.target.value })}
          placeholder={t("subtotalPlaceholder")}
          disabled={!invoice.saveAsPending}
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs">{t("taxLabel")}</Label>
        <Input
          value={invoice.taxTotal}
          onChange={(e) => onChange({ taxTotal: e.target.value })}
          placeholder={t("taxPlaceholder")}
          disabled={!invoice.saveAsPending}
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs">{t("grandTotalLabel")}</Label>
        <Input
          value={invoice.grandTotal}
          onChange={(e) => onChange({ grandTotal: e.target.value })}
          placeholder={t("grandTotalPlaceholder")}
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
  const t = useOcrInvoiceDraftTranslations();
  const lineFields: ReadonlyArray<{
    key: keyof OCRInvoiceLineForm;
    colSpan: number;
    placeholderKey: string;
  }> = [
    {
      key: "description",
      colSpan: 5,
      placeholderKey: "lineDescriptionPlaceholder",
    },
    { key: "quantity", colSpan: 2, placeholderKey: "lineQuantityPlaceholder" },
    {
      key: "unitPrice",
      colSpan: 2,
      placeholderKey: "lineUnitPricePlaceholder",
    },
    { key: "total", colSpan: 2, placeholderKey: "lineTotalPlaceholder" },
  ];
  return (
    <div className="grid gap-2 rounded-md border border-border bg-background p-2 sm:grid-cols-12">
      {lineFields.map(({ key, colSpan, placeholderKey }) => (
        <div key={key} className={`sm:col-span-${colSpan}`}>
          <Input
            value={row[key]}
            onChange={(e) =>
              onPatch(index, { [key]: e.target.value } as Partial<OCRInvoiceLineForm>)
            }
            placeholder={t(placeholderKey)}
            disabled={disabled}
          />
        </div>
      ))}
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
            {t("removeButton")}
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
  const t = useOcrInvoiceDraftTranslations();
  return (
    <div className="space-y-2">
      <Label className="text-xs">{t("lineItemsLabel")}</Label>
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
        {t("addLineItemButton")}
      </Button>
    </div>
  );
}
