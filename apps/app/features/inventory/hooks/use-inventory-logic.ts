
import { useMemo, useState } from "react";
import { apiHooks } from "@/lib/api-hooks";
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

    const {
        data: inventory = [],
        isLoading,
        refetch,
        isFetching,
    } = apiHooks.useInventory();

    const { data: stats, refetch: refetchStats } = apiHooks.useInventoryStats();

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

    const filteredInventory = useMemo(() => {
        return inventory.filter((item: InventoryItem) => {
            const matchesSearch =
                item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.category.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesCategory =
                categoryFilter === "all" || item.category === categoryFilter;

            const status = getStockStatus(item.quantity, item.minQuantity);
            const matchesStock =
                stockFilter === "all" ||
                (stockFilter === "low_critical" &&
                    (status.value === "low" || status.value === "critical")) ||
                status.value === stockFilter;

            return matchesSearch && matchesCategory && matchesStock;
        });
    }, [inventory, searchQuery, categoryFilter, stockFilter]);

    const uniqueCategories = useMemo(() => {
        return Array.from(new Set(inventory.map((item: InventoryItem) => item.category)));
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
