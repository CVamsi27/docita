import { Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@workspace/ui/components/form/button";
import { SymbolTooltip } from "@workspace/ui/components/overlay/tooltip";

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
  const { t } = useTranslation("Invoices");
  const tooltip = t("itemsTable.removeLineItemTooltip", {
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
