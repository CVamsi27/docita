import { z } from "zod";
import { inventoryItemSchema } from "../operations/inventory";
import { jsonObjectSchema } from "../shared/json-schema";

export const inventoryItemResponseSchema = inventoryItemSchema.strict();

export const listInventoryQuerySchema = z
  .object({
    category: z.string().optional(),
    lowStock: z
      .union([z.literal("true"), z.literal("false"), z.boolean()])
      .optional()
      .transform((value) => (value === "true" ? true : value === "false" ? false : value)),
  })
  .strict();

export const listInventoryResponseSchema = z
  .object({
    items: z.array(inventoryItemResponseSchema),
  })
  .strict();

export const inventoryCreateRequestSchema = inventoryItemSchema
  .omit({
    id: true,
    clinicId: true,
    createdAt: true,
    updatedAt: true,
    movements: true,
  })
  .extend({
    metadata: jsonObjectSchema.optional(),
  })
  .strict();

export const inventoryUpdateRequestSchema = inventoryCreateRequestSchema
  .partial()
  .strict();

export const inventoryUpdateStockRequestSchema = z
  .object({
    quantity: z.number().int().positive(),
    type: z.enum(["add", "subtract"]),
  })
  .strict();

export type InventoryItemContractResponse = z.infer<
  typeof inventoryItemResponseSchema
>;
export type ListInventoryContractQuery = z.infer<typeof listInventoryQuerySchema>;
export type ListInventoryContractResponse = z.infer<
  typeof listInventoryResponseSchema
>;
export type InventoryCreateRequest = z.infer<typeof inventoryCreateRequestSchema>;
export type InventoryUpdateRequest = z.infer<typeof inventoryUpdateRequestSchema>;
export type InventoryUpdateStockRequest = z.infer<
  typeof inventoryUpdateStockRequestSchema
>;

