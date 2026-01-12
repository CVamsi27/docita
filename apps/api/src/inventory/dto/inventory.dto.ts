import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const CreateInventoryItemSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  sku: z.string().optional(),
  quantity: z.number().int().min(0).optional(),
  minQuantity: z.number().int().min(0).optional(),
  unit: z.string().optional(),
  purchasePrice: z.number().positive().optional(),
  sellingPrice: z.number().positive().optional(),
  expiryDate: z.coerce.date().optional(),
  batchNumber: z.string().optional(),
  supplier: z.string().optional(),
});

export class CreateInventoryItemDto extends createZodDto(
  CreateInventoryItemSchema,
) {}

export const UpdateInventoryItemSchema =
  CreateInventoryItemSchema.partial().extend({
    active: z.boolean().optional(),
  });

export class UpdateInventoryItemDto extends createZodDto(
  UpdateInventoryItemSchema,
) {}

export const CreateMovementSchema = z.object({
  type: z.string(), // Could be enum: IN, OUT, ADJUSTMENT
  quantity: z.number(),
  referenceType: z.string().optional(),
  referenceId: z.string().optional(),
  notes: z.string().optional(),
});

export class CreateMovementDto extends createZodDto(CreateMovementSchema) {}
