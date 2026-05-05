import { Feature, InventoryItem } from "@workspace/types";
import { useAPIMutation, useAPIQuery } from "@/lib/api-core";
import { useTierFeatureEnabled } from "@/hooks/api/tier-feature-guards";
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
}) => {
  const inventoryOk = useTierFeatureEnabled(Feature.INVENTORY);
  return useAPIQuery<InventoryItem[]>(
    ["inventory", filters || {}],
    withQueryString("/inventory", filters),
    { enabled: inventoryOk },
  );
};

export const useInventoryStats = () => {
  const inventoryOk = useTierFeatureEnabled(Feature.INVENTORY);
  return useAPIQuery<{
    totalItems: number;
    totalStock: number;
    lowStock: number;
    critical: number;
    expiringSoon: number;
  }>(["inventory-stats"], "/inventory/stats", { enabled: inventoryOk });
};

export const useInventoryItem = (id: string) => {
  const inventoryOk = useTierFeatureEnabled(Feature.INVENTORY);
  return useAPIQuery<
    InventoryItem & {
      movements: {
        id: string;
        type: string;
        quantity: number;
        createdAt: string;
      }[];
    }
  >(["inventory", id], `/inventory/${id}`, {
    enabled: inventoryOk && id.length > 0,
  });
};

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
