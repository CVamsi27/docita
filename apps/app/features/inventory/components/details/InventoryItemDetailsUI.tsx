import { LoadingState, Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@workspace/ui/components";
import { Package } from "lucide-react";
import { useClinicCurrency } from "@/hooks/use-clinic-currency";
import { ItemInfoCard, ItemMovementsSection, type ItemDetail } from "./InventoryItemDetailsUISections";

export type { ItemMovement, ItemDetail } from "./InventoryItemDetailsUISections";

export interface InventoryItemDetailsUIProps {
  open: boolean;
  item: ItemDetail | null;
  isLoading: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InventoryItemDetailsUI({
  open,
  item,
  isLoading,
  onOpenChange,
}: InventoryItemDetailsUIProps) {
  const { formatCurrency } = useClinicCurrency();

  if (!open) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl flex flex-col h-full">
        <SheetHeader className="mb-6">
          <SheetTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-muted-foreground" />
            Item Details
          </SheetTitle>
          <SheetDescription>
            View inventory item information and movement history
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <LoadingState message="Loading item details…" />
        ) : item ? (
          <div className="flex-1 flex flex-col gap-6 overflow-hidden">
            <ItemInfoCard item={item} formatCurrency={formatCurrency} />
            <ItemMovementsSection movements={item.movements} />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Item not found
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
