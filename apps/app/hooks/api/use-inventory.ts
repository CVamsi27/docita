import { InventoryItem } from "@workspace/types";
import { useAPIMutation, useAPIQuery } from "@/lib/api-core";
import { withQueryString } from "@/lib/http/query-string";

interface InventoryMovementInput {
  type: string;
  quantity: number;
  referenceType?: string;
  referenceId?: string;
  notes?: string;
}

interface InventoryMovementResponse {
  id: string;
  itemId: string;
  type: string;
  quantity: number;
  referenceType?: string | null;
  referenceId?: string | null;
  notes?: string | null;
  createdAt: string;
}

export const useInventory = (filters?: {
  search?: string;
  category?: string;
  status?: string;
}) =>
  useAPIQuery<InventoryItem[]>(
    ["inventory", filters || {}],
    withQueryString("/inventory", filters),
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
    InventoryMovementResponse,
    InventoryMovementInput
  >(`/inventory/${itemId}/movements`, "POST");
