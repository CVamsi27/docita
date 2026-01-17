import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Eye, Package } from "lucide-react";
import { EmptyState, LoadingState } from "@workspace/ui/components/empty-state";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import type { InventoryItem } from "@workspace/types";
import type { StockStatus } from "../../../hooks/use-inventory-logic";

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
  const formatDate = (dateVal?: string | Date | null) => {
    if (!dateVal) return "-";
    return new Date(dateVal).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inventory Items</CardTitle>
        <CardDescription>
          A list of all items in your inventory. Click &quot;View&quot; for
          details.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <LoadingState message="Loading inventory..." />
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const status = getStockStatus(
                    item.quantity,
                    item.minQuantity
                  );
                  return (
                    <TableRow
                      key={item.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => onViewItem(item.id)}
                    >
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="capitalize text-muted-foreground">
                        {item.category}
                      </TableCell>
                      <TableCell>
                        {item.quantity} {item.unit}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={status.variant}
                          className="whitespace-nowrap"
                        >
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(item.expiryDate)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewItem(item.id);
                          }}
                        >
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <EmptyState
                        icon={Package}
                        title="No items found"
                        description="Adjust your filters or add a new item."
                      />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
