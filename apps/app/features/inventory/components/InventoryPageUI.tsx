import { FC } from "react";
import { AppPageScaffold } from "@workspace/ui/components/layout/app-page-scaffold";
import { PageHeader } from "@workspace/ui/components/layout/page-header";
import { StatGrid, type StatItem } from "@workspace/ui/components/data-display/stat-grid";
import { Button } from "@workspace/ui/components/form/button";
import { InventoryAddItemDialog } from "@/features/dialogs";
import { InventoryItemDetailsContainer as InventoryItemDetails } from "@/features/inventory/components/details/InventoryItemDetailsContainer";
import {
  AlertTriangle,
  BarChart3,
  Package,
  Plus,
  RefreshCw,
  TrendingDown,
} from "lucide-react";
import { useInventoryLogic } from "@/features/inventory/hooks/use-inventory-logic";
import { InventoryTable } from "./sections/list/InventoryTable";
import { InventoryFilters } from "./sections/list/InventoryFilters";

export const InventoryPageUI: FC = () => {
  const {
    filteredInventory,
    stats,
    isLoading,
    isFetching,
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    stockFilter,
    setStockFilter,
    isAddItemDialogOpen,
    setIsAddItemDialogOpen,
    selectedItemId,
    setSelectedItemId,
    uniqueCategories,
    getStockStatus,
    handleRefresh,
    refetch,
  } = useInventoryLogic();

  const statItems: StatItem[] = [
    {
      id: "total-items",
      label: "Total Items",
      value: stats?.totalItems ?? 0,
      description: "Unique products",
      icon: <Package className="h-4 w-4" />,
    },
    {
      id: "total-stock",
      label: "Total Stock",
      value: stats?.totalStock ?? 0,
      description: "Units in inventory",
      icon: <BarChart3 className="h-4 w-4" />,
    },
    {
      id: "low-stock",
      label: "Low Stock",
      value: stats?.lowStock ?? 0,
      description: "Items need restock",
      icon: <TrendingDown className="h-4 w-4" />,
      accent: "warning",
    },
    {
      id: "alerts",
      label: "Alerts",
      value: stats?.critical ?? 0,
      description: "Critical stock levels",
      icon: <AlertTriangle className="h-4 w-4" />,
      accent: "danger",
    },
  ];

  return (
    <AppPageScaffold
      header={
        <PageHeader
          title="Inventory"
          description="Manage your facility's inventory and supplies."
          actions={
            <div className="flex gap-2">
              <Button variant="outline" className="gap-2" onClick={handleRefresh}>
                <RefreshCw
                  className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
              <Button
                className="gap-2"
                onClick={() => setIsAddItemDialogOpen(true)}
              >
                <Plus className="h-4 w-4" />
                Add Item
              </Button>
            </div>
          }
        />
      }
    >
      <StatGrid items={statItems} columns={4} />

      <InventoryFilters
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        stockFilter={stockFilter}
        setStockFilter={setStockFilter}
        uniqueCategories={uniqueCategories}
      />

      <InventoryTable
        items={filteredInventory}
        isLoading={isLoading}
        onViewItem={setSelectedItemId}
        getStockStatus={getStockStatus}
      />

      <InventoryAddItemDialog
        isOpen={isAddItemDialogOpen}
        onClose={() => setIsAddItemDialogOpen(false)}
        onSuccess={() => {
          setIsAddItemDialogOpen(false);
          refetch();
        }}
      />

      <InventoryItemDetails
        itemId={selectedItemId}
        open={!!selectedItemId}
        onOpenChange={(open: boolean) => !open && setSelectedItemId(null)}
      />
    </AppPageScaffold>
  );
};
