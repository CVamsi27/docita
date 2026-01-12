
import { FC } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Badge } from "@workspace/ui/components/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Feature,
  FeatureGate,
} from "@/features/_shared/components/feature-gate";
import { InventoryAddItemDialog } from "@/features/dialogs/components/InventoryAddItemDialogContainer";
import { InventoryItemDetails } from "@/features/inventory/components/InventoryItemDetailsContainer";
import {
  AlertTriangle,
  BarChart3,
  Eye,
  Package,
  Plus,
  RefreshCw,
  Search,
  TrendingDown,
} from "lucide-react";
import { EmptyState, LoadingState } from "@workspace/ui/components/empty-state";
import { useInventoryLogic, StockStatus } from "../hooks/use-inventory-logic";

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

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

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
      <div className="flex flex-col gap-6 p-4 md:p-6 container mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
            <p className="text-muted-foreground">
              Manage your clinic&apos;s inventory and supplies
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={handleRefresh}
            >
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

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
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
              <TrendingDown className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">
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
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">
                {stats?.critical ?? 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Critical stock levels
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search inventory..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {uniqueCategories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={stockFilter} onValueChange={setStockFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Stock Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="low_critical">Low & Critical</SelectItem>
              <SelectItem value="in_stock">In Stock</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Inventory Table */}
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
                    {filteredInventory.map((item) => {
                      const status = getStockStatus(
                        item.quantity,
                        item.minQuantity,
                      );
                      return (
                        <TableRow
                          key={item.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setSelectedItemId(item.id)}
                        >
                          <TableCell className="font-medium">
                            {item.name}
                          </TableCell>
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
                                setSelectedItemId(item.id);
                              }}
                            >
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredInventory.length === 0 && (
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
