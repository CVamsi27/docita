"use client";

// jscpd:ignore-start
import { useTranslations } from "next-intl";
import { Input } from "@workspace/ui/components/form/input";
import { Label } from "@workspace/ui/components/form/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import { Button } from "@workspace/ui/components/form/button";
import { SymbolTooltip } from "@workspace/ui/components/overlay/tooltip";
import { Trash2 } from "lucide-react";

export interface InvoiceItem {
// jscpd:ignore-end
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

/**
 * Phase 3 (per-feature): mobile-card variant of the invoice
 * items table — same data, different layout for narrow
 * viewports. Reuses the Invoices.itemsTable namespace from
 * InvoiceItemsTable so the two variants stay in sync. 10
 * literals converted.
 */
function useInvoiceItemsCardTranslations() {
  return useTranslations("Invoices.itemsTable");
}

export function InvoiceItemCard({
  item,
  index,
  onUpdateItem,
  onRemoveItem,
  formatCurrency,
}: {
  item: InvoiceItem;
  index: number;
  onUpdateItem: (index: number, field: string, value: string | number) => void;
  onRemoveItem: (index: number) => void;
  formatCurrency: (amount: number) => string;
}) {
  const t = useInvoiceItemsCardTranslations();
  return (
    <div className="ui-card-surface space-y-3 p-4">
      <div className="space-y-1.5">
        <Label htmlFor={`item-desc-${item.id}`}>{t("colDescription")}</Label>
        <Input
          id={`item-desc-${item.id}`}
          value={item.description}
          onChange={(e) => onUpdateItem(index, "description", e.target.value)}
          placeholder={t("itemDescriptionPlaceholder")}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor={`item-qty-${item.id}`}>{t("colQty")}</Label>
          <Input
            id={`item-qty-${item.id}`}
            type="number"
            min="1"
            value={item.quantity}
            onChange={(e) =>
              onUpdateItem(index, "quantity", parseFloat(e.target.value))
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`item-price-${item.id}`}>{t("colUnitPrice")}</Label>
          <Input
            id={`item-price-${item.id}`}
            type="number"
            min="0"
            step="0.01"
            value={item.unitPrice}
            onChange={(e) =>
              onUpdateItem(index, "unitPrice", parseFloat(e.target.value))
            }
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`item-tax-${item.id}`}>{t("colTax")}</Label>
        <Select
          value={item.taxTreatment}
          onValueChange={(value) => onUpdateItem(index, "taxTreatment", value)}
        >
          <SelectTrigger id={`item-tax-${item.id}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="EXEMPT_HEALTHCARE">{t("taxHealthcareExempt")}</SelectItem>
            <SelectItem value="TAXABLE">{t("taxTaxable")}</SelectItem>
            <SelectItem value="EXEMPT">{t("taxExempt")}</SelectItem>
            <SelectItem value="NON_GST">{t("taxNonGst")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor={`item-gst-${item.id}`}>{t("colGstPercent")}</Label>
          <Input
            id={`item-gst-${item.id}`}
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
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`item-hsn-${item.id}`}>{t("colHsnSac")}</Label>
          <Input
            id={`item-hsn-${item.id}`}
            value={item.hsnCode || item.sacCode || ""}
            onChange={(e) => onUpdateItem(index, "hsnCode", e.target.value)}
            placeholder={t("hsnCodePlaceholder")}
          />
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-3">
        <span className="text-sm font-medium">
          {t("colTotal")}: {formatCurrency(item.total)}
        </span>
        <SymbolTooltip
          label={t("removeLineItemTooltip", { name: item.description || "" })}
        >
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("removeLineItemTooltip", { name: item.description || "" })}
            className="text-destructive hover:text-destructive/90 touch-manipulation"
            onClick={() => onRemoveItem(index)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </SymbolTooltip>
      </div>
    </div>
  );
}
