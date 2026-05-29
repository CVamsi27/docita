"use client";

import {
  DataTable,
  type DataTableColumn,
} from "@workspace/ui/components/data-display/data-table";
import { ListRow } from "@workspace/ui/components/data-display/list-row";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { Button } from "@workspace/ui/components/form/button";
import { SymbolTooltip } from "@workspace/ui/components/overlay/tooltip";
import { Eye } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import type { InventoryItem } from "@workspace/types";
import type { StockStatus } from "@/features/inventory/hooks/use-inventory-logic";
import {
  DATE_FORMAT_OPTIONS_US_SHORT,
  formatDateSafe,
} from "@/lib/formatters";

interface InventoryTableProps {
  items: InventoryItem[];
  isLoading: boolean;
  onViewItem: (id: string) => void;
  getStockStatus: (quantity: number, minStock: number) => StockStatus;
}

export function InventoryTable({
  items,
  isLoading,
  onViewItem,
  getStockStatus,
}: InventoryTableProps) {
  const columns: DataTableColumn<InventoryItem>[] = [
    {
      id: "name",
      header: "Item name",
      cell: (item) => <span className="font-medium">{item.name}</span>,
    },
    {
      id: "category",
      header: "Category",
      hiddenOnMobile: true,
      cell: (item) => (
        <span className="capitalize text-muted-foreground">{item.category}</span>
      ),
    },
    {
      id: "quantity",
      header: "Quantity",
      cell: (item) => (
        <span>
          {item.quantity} {item.unit}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (item) => {
        const status = getStockStatus(item.quantity, item.minQuantity);
        return (
          <Badge variant={status.variant} className="whitespace-nowrap">
            {status.label}
          </Badge>
        );
      },
    },
    {
      id: "expiry",
      header: "Expiry",
      hiddenOnMobile: true,
      cell: (item) => (
        <span className="text-muted-foreground">
          {formatDateSafe(item.expiryDate, DATE_FORMAT_OPTIONS_US_SHORT)}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      align: "right",
      cell: (item) => (
        <SymbolTooltip label="View item details">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onViewItem(item.id);
            }}
            aria-label="View item details"
          >
            <Eye className="h-4 w-4 text-muted-foreground" />
          </Button>
        </SymbolTooltip>
      ),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inventory items</CardTitle>
        <CardDescription>
          A list of all items in your inventory. Click &quot;View&quot; for
          details.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={columns}
          data={items}
          rowKey={(item) => item.id}
          isLoading={isLoading}
          emptyTitle="No items found"
          emptyDescription="Adjust your filters or add a new item"
          onRowClick={(item) => onViewItem(item.id)}
          stackOnMobile
          mobileRenderer={(item) => {
            const status = getStockStatus(item.quantity, item.minQuantity);
            const expiryLabel = item.expiryDate
              ? formatDateSafe(item.expiryDate, DATE_FORMAT_OPTIONS_US_SHORT)
              : null;
            return (
              <ListRow
                title={item.name}
                meta={`${item.category} · ${item.quantity} ${item.unit}`}
                time={expiryLabel ? `Exp ${expiryLabel}` : null}
                onClick={() => onViewItem(item.id)}
                trailing={
                  <Badge variant={status.variant} className="whitespace-nowrap">
                    {status.label}
                  </Badge>
                }
              />
            );
          }}
          className="ui-card-surface"
        />
      </CardContent>
    </Card>
  );
}
