import { format } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import { Badge } from "@workspace/ui/components/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { LoadingState } from "@workspace/ui/components/empty-state";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { ArrowDownLeft, ArrowUpRight, History, Package } from "lucide-react";

export interface InventoryMovement {
  id: string;
  type: string;
  quantity: number;
  createdAt: string;
  notes?: string;
}

export interface InventoryItem {
  name: string;
  category: string;
  sku?: string;
  quantity?: number;
  minQuantity?: number;
  unit?: string;
  purchasePrice?: number;
  sellingPrice?: number;
  expiryDate?: string;
  movements?: InventoryMovement[];
}

export interface InventoryItemDetailsUIProps {
  open: boolean;
  item: InventoryItem | null;
  isLoading: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InventoryItemDetailsUI({
  open,
  item,
  isLoading,
  onOpenChange,
}: InventoryItemDetailsUIProps) {
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
          <LoadingState message="Loading item details..." />
        ) : item ? (
          <div className="flex-1 flex flex-col gap-6 overflow-hidden">
            <div className="grid gap-4 p-4 border rounded-lg bg-muted/20">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg">{item.name}</h3>
                  <div className="text-sm text-muted-foreground capitalize">
                    {item.category} • SKU: {item.sku || "N/A"}
                  </div>
                </div>
                <Badge
                  variant={
                    (item.quantity || 0) <= (item.minQuantity || 0)
                      ? "destructive"
                      : "outline"
                  }
                  className="text-sm"
                >
                  {item.quantity} {item.unit}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground block">
                    Purchase Price
                  </span>
                  <span className="font-medium">
                    ₹{item.purchasePrice || 0}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">
                    Selling Price
                  </span>
                  <span className="font-medium">₹{item.sellingPrice || 0}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">
                    Min. Quantity
                  </span>
                  <span className="font-medium">
                    {item.minQuantity || 0} {item.unit}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">
                    Expiry Date
                  </span>
                  <span className="font-medium">
                    {item.expiryDate
                      ? format(new Date(item.expiryDate), "PPP")
                      : "N/A"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex items-center gap-2 mb-3">
                <History className="h-4 w-4 text-muted-foreground" />
                <h4 className="font-semibold text-sm">Recent Movements</h4>
              </div>

              <div className="border rounded-md flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">Type</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {item.movements && item.movements.length > 0 ? (
                        item.movements.map((movement) => {
                          const isInbound =
                            movement.type === "in" ||
                            movement.type === "adjustment";
                          return (
                            <TableRow key={movement.id}>
                              <TableCell className="font-medium capitalize flex items-center gap-1.5">
                                {isInbound ? (
                                  <ArrowDownLeft className="h-3 w-3 text-green-500" />
                                ) : (
                                  <ArrowUpRight className="h-3 w-3 text-orange-500" />
                                )}
                                {movement.type}
                              </TableCell>
                              <TableCell>
                                <span
                                  className={
                                    isInbound
                                      ? "text-green-600 font-medium"
                                      : "text-orange-600 font-medium"
                                  }
                                >
                                  {isInbound ? "+" : "-"}
                                  {movement.quantity}
                                </span>
                              </TableCell>
                              <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                                {format(
                                  new Date(movement.createdAt),
                                  "MMM d, yyyy",
                                )}
                              </TableCell>
                              <TableCell className="text-right text-xs text-muted-foreground max-w-[150px] truncate">
                                {movement.notes || "-"}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="text-center py-8 text-muted-foreground text-sm"
                          >
                            No movements recorded yet
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </div>
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
