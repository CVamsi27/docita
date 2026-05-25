import { z } from "zod";
import { requiredStringSchema } from "./common";

export const inventoryAddItemFormSchema = z.object({
  name: requiredStringSchema("Item Name"),
  category: requiredStringSchema("Category"),
  quantity: z
    .string()
    .refine((val) => !Number.isNaN(Number(val)) && Number(val) >= 0, {
      message: "Quantity must be a valid non-negative number",
    }),
  minStock: z
    .string()
    .refine((val) => !val || (!Number.isNaN(Number(val)) && Number(val) >= 0), {
      message: "Minimum stock must be a valid non-negative number",
    })
    .optional(),
  expiryDate: z.string().optional(),
});

export type InventoryAddItemFormValues = z.infer<
  typeof inventoryAddItemFormSchema
>;
