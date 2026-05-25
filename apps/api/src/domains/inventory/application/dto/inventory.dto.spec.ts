import { describe, expect, it } from '@jest/globals';

import {
  createInventoryItemSchema,
  inventoryMovementSchema,
  updateInventoryItemSchema,
} from './inventory.dto';

describe('inventory DTO schemas', () => {
  describe('createInventoryItemSchema', () => {
    it('accepts a valid item', () => {
      const result = createInventoryItemSchema.safeParse({
        name: 'Paracetamol 500mg',
        category: 'Analgesic',
        quantity: 100,
        minQuantity: 10,
        unit: 'tablets',
        sku: 'PARA-500',
        purchasePrice: 1.5,
        sellingPrice: 2.5,
      });

      expect(result.success).toBe(true);
    });

    it('rejects an empty name with a field-specific message', () => {
      const result = createInventoryItemSchema.safeParse({
        name: '   ',
        category: 'Analgesic',
        quantity: 10,
        minQuantity: 1,
        unit: 'tablets',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues.find((i) => i.path[0] === 'name');
        expect(issue?.message).toBe('Name is required');
      }
    });

    it('rejects negative quantity', () => {
      const result = createInventoryItemSchema.safeParse({
        name: 'Item',
        category: 'Cat',
        quantity: -5,
        minQuantity: 0,
        unit: 'each',
      });

      expect(result.success).toBe(false);
    });

    it('rejects non-ISO datetime expiryDate', () => {
      const result = createInventoryItemSchema.safeParse({
        name: 'Item',
        category: 'Cat',
        quantity: 1,
        minQuantity: 0,
        unit: 'each',
        expiryDate: 'tomorrow',
      });

      expect(result.success).toBe(false);
    });

    it('rejects extra unknown fields when strictly used (not strict by default)', () => {
      const result = createInventoryItemSchema.safeParse({
        name: 'Item',
        category: 'Cat',
        quantity: 1,
        minQuantity: 0,
        unit: 'each',
        unknownField: 'should be ignored by default',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('updateInventoryItemSchema', () => {
    it('rejects unknown fields (strict)', () => {
      const result = updateInventoryItemSchema.safeParse({
        name: 'Updated name',
        rogueField: true,
      });

      expect(result.success).toBe(false);
    });

    it('allows partial updates', () => {
      const result = updateInventoryItemSchema.safeParse({
        active: false,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('inventoryMovementSchema', () => {
    it('accepts a valid movement', () => {
      const result = inventoryMovementSchema.safeParse({
        type: 'IN',
        quantity: 10,
        notes: 'Restocked from supplier',
      });

      expect(result.success).toBe(true);
    });

    it('rejects zero quantity', () => {
      const result = inventoryMovementSchema.safeParse({
        type: 'IN',
        quantity: 0,
      });

      expect(result.success).toBe(false);
    });

    it('rejects unknown movement type', () => {
      const result = inventoryMovementSchema.safeParse({
        type: 'TRANSFER',
        quantity: 1,
      });

      expect(result.success).toBe(false);
    });
  });
});
