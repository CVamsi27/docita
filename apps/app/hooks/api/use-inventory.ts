import { InventoryItem } from "@workspace/types";
import { useAPIMutation, useAPIQuery } from "../../lib/api-core";

export const useInventory = (filters?: {
  search?: string;
  category?: string;
  status?: string;
}) =>
  useAPIQuery<InventoryItem[]>(
    ["inventory", filters],
    `/inventory${filters ? `?${new URLSearchParams(filters as Record<string, string>).toString()}` : ""}`,
  );

export const useInventoryStats = () =>
  useAPIQuery<{
    totalItems: number;
    totalStock: number;
    lowStock: number;
    critical: number;
    expiringSoon: number;
  }>(["inventory-stats"], "/inventory/stats");

export const useInventoryItem = (id: string) =>
  useAPIQuery<
    InventoryItem & {
      movements: {
        id: string;
        type: string;
        quantity: number;
        createdAt: string;
      }[];
    }
  >(["inventory", id], `/inventory/${id}`);

export const useCreateInventoryItem = () =>
  useAPIMutation<InventoryItem, Partial<InventoryItem>>("/inventory", "POST");

export const useUpdateInventoryItem = (id: string) =>
  useAPIMutation<InventoryItem, Partial<InventoryItem>>(
    `/inventory/${id}`,
    "PATCH",
  );

export const useDeleteInventoryItem = (id: string) =>
  useAPIMutation<void, void>(`/inventory/${id}`, "DELETE");

export const useAddInventoryMovement = (itemId: string) =>
  useAPIMutation<
    unknown,
    {
      type: string;
      quantity: number;
      referenceType?: string;
      referenceId?: string;
      notes?: string;
    }
  >(`/inventory/${itemId}/movements`, "POST");
