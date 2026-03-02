import { api } from "@/lib/api-client";
import { InventoryItem } from "@workspace/types";

export type CreateInventoryItemInput = Omit<
  InventoryItem,
  "id" | "createdAt" | "updatedAt"
>;
export type UpdateInventoryItemInput = Partial<CreateInventoryItemInput>;

export const inventoryApi = {
  getAll: (params?: { category?: string; lowStock?: boolean }) => {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set("category", params.category);
    if (params?.lowStock) searchParams.set("lowStock", "true");
    return api.get<InventoryItem[]>(`/inventory?${searchParams}`);
  },

  getById: (id: string) => api.get<InventoryItem>(`/inventory/${id}`),

  create: (data: CreateInventoryItemInput) =>
    api.post<InventoryItem>("/inventory", data),

  update: (id: string, data: UpdateInventoryItemInput) =>
    api.patch<InventoryItem>(`/inventory/${id}`, data),

  updateStock: (id: string, quantity: number, type: "add" | "subtract") =>
    api.post<InventoryItem>(`/inventory/${id}/stock`, { quantity, type }),

  getLowStockItems: () => api.get<InventoryItem[]>("/inventory/low-stock"),
};
