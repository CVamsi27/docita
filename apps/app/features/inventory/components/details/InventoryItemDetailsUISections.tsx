// jscpd:ignore-start
import { formatDate } from "@workspace/utils";
import { useTranslations } from "next-intl";
import { Badge } from "@workspace/ui/components/indicators/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/data-display/table";
import { ScrollArea } from "@workspace/ui/components/layout/scroll-area";
import { ArrowDownLeft, ArrowUpRight, History } from "lucide-react";

/**
 * Phase 3 (per-feature): apps/app Inventory > Item details
 * (item info card + recent movements table). 9 literals
 * converted to useTranslations("Inventory.itemDetails").
 */
function useInventoryItemDetailsTranslations() {
  return useTranslations("Inventory.itemDetails");
}

export interface ItemMovement {
// jscpd:ignore-end
  id: string;
  type: string;
  quantity: number;
  createdAt: string;
  notes?: string;
}

export interface ItemDetail {
  name: string;
  category: string;
  sku?: string;
  quantity?: number;
  minQuantity?: number;
  unit?: string;
  purchasePrice?: number;
  sellingPrice?: number;
  expiryDate?: string;
  movements?: ItemMovement[];
}
export function ItemInfoCard({
  item,
  formatCurrency,
}: {
  item: ItemDetail;
  formatCurrency: (
    amount: number,
    opts?: { fractionDigits?: number },
  ) => string;
}) {
  const t = useInventoryItemDetailsTranslations();
  return (
    <div className="grid gap-4 p-4 border rounded-lg bg-muted/20">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold text-lg">{item.name}</h3>
          <div className="text-sm text-muted-foreground capitalize">
            {item.category} • {t("skuLabel", { sku: item.sku || t("notAvailable") })}
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
          <span className="text-muted-foreground block">{t("purchasePriceLabel")}</span>
          <span className="font-medium">
            {formatCurrency(item.purchasePrice || 0, { fractionDigits: 0 })}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground block">{t("sellingPriceLabel")}</span>
          <span className="font-medium">
            {formatCurrency(item.sellingPrice || 0, { fractionDigits: 0 })}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground block">{t("minQuantityLabel")}</span>
          <span className="font-medium">
            {item.minQuantity || 0} {item.unit}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground block">{t("expiryDateLabel")}</span>
          <span className="font-medium">
            {item.expiryDate
              ? formatDate(item.expiryDate, "dd MMMM yyyy")
              : t("notAvailable")}
          </span>
        </div>
      </div>
    </div>
  );
}
export function ItemMovementsSection({
  movements,
}: {
  movements?: ItemMovement[];
}) {
  const t = useInventoryItemDetailsTranslations();
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center gap-2 mb-3">
        <History className="h-4 w-4 text-muted-foreground" />
        <h4 className="font-semibold text-sm">{t("recentMovementsTitle")}</h4>
      </div>

      <div className="border rounded-md flex-1 overflow-hidden">
        <div className="md:hidden divide-y max-h-[min(50vh,320px)] overflow-y-auto">
          {movements && movements.length > 0 ? (
            movements.map((movement) => {
              const isInbound =
                movement.type === "in" || movement.type === "adjustment";
              return (
                <div
                  key={movement.id}
                  className="p-3 space-y-1.5 text-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium capitalize flex items-center gap-1.5">
                      {isInbound ? (
                        <ArrowDownLeft className="h-3 w-3 text-success shrink-0" />
                      ) : (
                        <ArrowUpRight className="h-3 w-3 text-warning shrink-0" />
                      )}
                      {movement.type}
                    </span>
                    <span
                      className={
                        isInbound
                          ? "text-success font-medium tabular-nums"
                          : "text-warning font-medium tabular-nums"
                      }
                    >
                      {isInbound ? "+" : "-"}
                      {movement.quantity}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(movement.createdAt, "MMM d, yyyy")}
                  </p>
                  {movement.notes ? (
                    <p className="text-xs text-muted-foreground break-words">
                      {movement.notes}
                    </p>
                  ) : null}
                </div>
              );
            })
          ) : (
            <p className="text-center py-8 text-muted-foreground text-sm">
              {t("noMovementsRecorded")}
            </p>
          )}
        </div>
        <ScrollArea className="h-full hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">{t("tableTypeHeader")}</TableHead>
                <TableHead>{t("tableQtyHeader")}</TableHead>
                <TableHead>{t("tableDateHeader")}</TableHead>
                <TableHead className="text-right">{t("tableNotesHeader")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements && movements.length > 0 ? (
                movements.map((movement) => {
                  const isInbound =
                    movement.type === "in" || movement.type === "adjustment";
                  return (
                    <TableRow key={movement.id}>
                      <TableCell className="font-medium capitalize flex items-center gap-1.5">
                        {isInbound ? (
                          <ArrowDownLeft className="h-3 w-3 text-success" />
                        ) : (
                          <ArrowUpRight className="h-3 w-3 text-warning" />
                        )}
                        {movement.type}
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            isInbound
                              ? "text-success font-medium"
                              : "text-warning font-medium"
                          }
                        >
                          {isInbound ? "+" : "-"}
                          {movement.quantity}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                        {formatDate(movement.createdAt, "MMM d, yyyy")}
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
                    {t("noMovementsRecorded")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
    </div>
  );
}
