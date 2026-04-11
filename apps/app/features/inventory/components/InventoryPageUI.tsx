import { FC } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import {
  Feature,
  FeatureGate,
} from "@/features/_shared/components/auth/feature-gate";
import { InventoryAddItemDialog } from "@/features/dialogs/components/InventoryAddItemDialogContainer";
import { InventoryItemDetailsContainer as InventoryItemDetails } from "@/features/inventory/components";
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

  return (
    <FeatureGate
      feature={Feature.INVENTORY}
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
          <h2 className="text-2xl font-bold mb-2">Inventory Management</h2>
          <p className="text-muted-foreground mb-4">
            Upgrade to access inventory management features
          </p>
        </div>
      }
    >
      <div className="flex flex-col gap-6 container mx-auto">
        {}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Inventory</h1>
            <p className="text-muted-foreground">
              Manage your clinic&apos;s inventory and supplies
            </p>
          </div>
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
        </div>

        {}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Items</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalItems ?? 0}</div>
              <p className="text-xs text-muted-foreground">Unique products</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Stock</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalStock ?? 0}</div>
              <p className="text-xs text-muted-foreground">
                Units in inventory
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
              <TrendingDown className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">
                {stats?.lowStock ?? 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Items need restock
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Alerts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {stats?.critical ?? 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Critical stock levels
              </p>
            </CardContent>
          </Card>
        </div>

        {}
        <InventoryFilters
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          stockFilter={stockFilter}
          setStockFilter={setStockFilter}
          uniqueCategories={uniqueCategories}
        />

        {}
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
      </div>
    </FeatureGate>
  );
};
