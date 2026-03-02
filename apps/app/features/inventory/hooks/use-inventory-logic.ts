import { useMemo, useState } from "react";
import { useInventory, useInventoryStats } from "@/hooks/api/use-inventory";
import { useDebounce } from "@workspace/hooks/use-debounce";
import { InventoryItem } from "@workspace/types";

export interface StockStatus {
  label: string;
  variant: "destructive" | "secondary" | "default";
  value: "critical" | "low" | "in_stock";
}

export const useInventoryLogic = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [stockFilter, setStockFilter] = useState<string>("all");
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const debouncedSearch = useDebounce(searchQuery, 300);

  const {
    data: inventory = [],
    isLoading,
    refetch,
    isFetching,
  } = useInventory({
    search: debouncedSearch,
    category: categoryFilter !== "all" ? categoryFilter : undefined,
    status: stockFilter !== "all" ? stockFilter : undefined,
  });

  const { data: stats, refetch: refetchStats } = useInventoryStats();

  const getStockStatus = (quantity: number, minStock: number): StockStatus => {
    if (quantity <= minStock * 0.5)
      return {
        label: "Critical",
        variant: "destructive",
        value: "critical",
      };
    if (quantity <= minStock)
      return {
        label: "Low Stock",
        variant: "secondary",
        value: "low",
      };
    return {
      label: "In Stock",
      variant: "default",
      value: "in_stock",
    };
  };

  const filteredInventory = inventory;

  const uniqueCategories = useMemo(() => {
    return Array.from(
      new Set(inventory.map((item: InventoryItem) => item.category)),
    );
  }, [inventory]);

  const handleRefresh = () => {
    refetch();
    refetchStats();
  };

  return {
    inventory,
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
  };
};
