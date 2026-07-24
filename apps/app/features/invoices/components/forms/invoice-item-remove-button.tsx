"use client";

import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@workspace/ui/components/form/button";
import { SymbolTooltip } from "@workspace/ui/components/overlay/tooltip";

/**
 * Trash button + tooltip used to remove a single line item from the
 * invoice items table (both the desktop table view and the mobile card
 * view). Pulled out of InvoiceItemsTable / InvoiceItemsTableSections
 * so the markup and aria-label string stay in sync.
 */
export function InvoiceItemRemoveButton({
  description,
  onClick,
  size = "icon",
  variant = "ghost",
  className,
}: {
  description?: string;
  onClick: () => void;
  size?: "icon" | "sm" | "default";
  variant?:
    | "ghost"
    | "outline"
    | "destructive"
    | "default"
    | "secondary"
    | "link";
  className?: string;
}) {
  const t = useTranslations("Invoices.itemsTable");
  const tooltip = t("removeLineItemTooltip", {
    name: description || "",
  });
  return (
    <SymbolTooltip label={tooltip}>
      <Button
        variant={variant}
        size={size}
        aria-label={tooltip}
        className={`text-destructive hover:text-destructive/90 touch-manipulation${
          className ? ` ${className}` : ""
        }`}
        onClick={onClick}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </SymbolTooltip>
  );
}
