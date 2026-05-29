"use client";

import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/data-display/table";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { Button } from "@workspace/ui/components/form/button";
import { SymbolTooltip } from "@workspace/ui/components/overlay/tooltip";
import { Eye, Package } from "lucide-react";
import { EmptyState, LoadingState } from "@workspace/ui/components/feedback/empty-state";
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
        {isLoading ? (
          <LoadingState message="Loading inventory…" />
        ) : (
          <>
          <div className="mb-4 space-y-3 md:hidden">
            {items.map((item) => {
              const status = getStockStatus(item.quantity, item.minQuantity);
              return (
                <button
                  key={item.id}
                  type="button"
                  className="ui-card-surface w-full space-y-2 p-4 text-left touch-manipulation"
                  onClick={() => onViewItem(item.id)}
                >
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm capitalize text-muted-foreground">
                    {item.category}
                  </p>
                  <p className="text-sm">
                    {item.quantity} {item.unit}
                  </p>
                  <Badge variant={status.variant}>{status.label}</Badge>
                  {item.expiryDate ? (
                    <p className="text-xs text-muted-foreground">
                      Expires{" "}
                      {formatDateSafe(
                        item.expiryDate,
                        DATE_FORMAT_OPTIONS_US_SHORT,
                      )}
                    </p>
                  ) : null}
                </button>
              );
            })}
          </div>
          <div className="hidden overflow-x-auto overscroll-x-contain rounded-md border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item name</TableHead>
                  <TableHead className="hidden sm:table-cell">Category</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Expiry</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const status = getStockStatus(
                    item.quantity,
                    item.minQuantity,
                  );
                  return (
                    <TableRow
                      key={item.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => onViewItem(item.id)}
                    >
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="hidden sm:table-cell capitalize text-muted-foreground">
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
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {formatDateSafe(
                          item.expiryDate,
                          DATE_FORMAT_OPTIONS_US_SHORT,
                        )}
                      </TableCell>
                      <TableCell className="text-right">
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
                        description="Adjust your filters or add a new item"
                      />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
