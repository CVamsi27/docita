import { api } from "@/lib/api-client";
import { z } from "zod";
import {
  type InventoryItemContractResponse,
  inventoryCreateRequestSchema,
  inventoryItemResponseSchema,
  inventoryUpdateRequestSchema,
  inventoryUpdateStockRequestSchema,
  listInventoryQuerySchema,
  listInventoryResponseSchema,
} from "@workspace/types";

export type CreateInventoryItemInput = Omit<
  InventoryItemContractResponse,
  "id" | "createdAt" | "updatedAt"
>;
export type UpdateInventoryItemInput = Partial<CreateInventoryItemInput>;

export const inventoryApi = {
  getAll: (params?: { category?: string; lowStock?: boolean }) => {
    const parsedQuery = params
      ? listInventoryQuerySchema.parse({
          category: params.category,
          lowStock: params.lowStock,
        })
      : undefined;

    return api
      .validate("/inventory", listInventoryResponseSchema, {
        params: parsedQuery,
      })
      .then((res) => res.items);
  },

  getById: (id: string) =>
    api.validate(`/inventory/${id}`, inventoryItemResponseSchema),

  create: (data: CreateInventoryItemInput) =>
    api
      .post("/inventory", inventoryCreateRequestSchema.parse(data))
      .then((res) => inventoryItemResponseSchema.parse(res)),

  update: (id: string, data: UpdateInventoryItemInput) =>
    api
      .patch(`/inventory/${id}`, inventoryUpdateRequestSchema.parse(data))
      .then((res) => inventoryItemResponseSchema.parse(res)),

  updateStock: (id: string, quantity: number, type: "add" | "subtract") =>
    api
      .post(
        `/inventory/${id}/stock`,
        inventoryUpdateStockRequestSchema.parse({ quantity, type }),
      )
      .then((res) => inventoryItemResponseSchema.parse(res)),

  getLowStockItems: () =>
    api
      .validate("/inventory/low-stock", z.array(inventoryItemResponseSchema))
      .then((res) => res),
};
