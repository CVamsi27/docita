import { Feature, InventoryItem } from "@workspace/types";
import { queryKeys } from "../lib/query-keys-clinician";
import { useAPIMutation } from "../core/use-api-mutation";
import { useAPIQuery } from "../core/use-api-query";
import { withQueryString } from "../lib/query-string";
import { useDataAccessContext } from "../provider/hooks";

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
  const inventoryOk = useDataAccessContext().isTierFeatureEnabled(
    Feature.INVENTORY,
  );
  return useAPIQuery<InventoryItem[]>(
    queryKeys.inventory.list(filters),
    withQueryString("/inventory", filters),
    { enabled: inventoryOk },
  );
};

export const useInventoryStats = () => {
  const inventoryOk = useDataAccessContext().isTierFeatureEnabled(
    Feature.INVENTORY,
  );
  return useAPIQuery<{
    totalItems: number;
    totalStock: number;
    lowStock: number;
    critical: number;
    expiringSoon: number;
  }>(queryKeys.inventory.stats(), "/inventory/stats", { enabled: inventoryOk });
};

export const useInventoryItem = (id: string) => {
  const inventoryOk = useDataAccessContext().isTierFeatureEnabled(
    Feature.INVENTORY,
  );
  return useAPIQuery<
    InventoryItem & {
      movements: {
        id: string;
        type: string;
        quantity: number;
        createdAt: string;
      }[];
    }
  >(queryKeys.inventory.detail(id), `/inventory/${id}`, {
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
  useAPIMutation<InventoryMovementResponse, InventoryMovementInput>(
    `/inventory/${itemId}/movements`,
    "POST",
  );
