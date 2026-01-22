import { Test, TestingModule } from '@nestjs/testing';
import { InventoryFactory } from './inventory.factory';
import { ZodError } from 'zod';

describe('InventoryFactory', () => {
  let factory: InventoryFactory;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InventoryFactory],
    }).compile();

    factory = module.get<InventoryFactory>(InventoryFactory);
  });

  describe('createItem', () => {
    it('should validate and return item data with defaults', () => {
      const data = {
        name: 'Paracetamol',
        category: 'Medicine',
        clinicId: 'clinic-1',
        quantity: 10,
      };

      const result = factory.createItem(data);

      expect(result).toEqual(
        expect.objectContaining({
          name: 'Paracetamol',
          active: true,
          unit: 'units',
          minQuantity: 5,
        }),
      );
    });

    it('should throw error for invalid data', () => {
      const data = {
        name: '', // Invalid
        category: 'Medicine',
        clinicId: 'clinic-1',
      };

      expect(() => factory.createItem(data as any)).toThrow(ZodError);
    });
  });

  describe('createMovement', () => {
    it('should validate movement data', () => {
      const data = {
        type: 'in',
        quantity: 5,
        inventoryItemId: 'item-1',
        createdBy: 'user-1',
      };

      const result = factory.createMovement(data as any);

      expect(result.type).toBe('in');
      expect(result.quantity).toBe(5);
    });

    it('should throw error if quantity is negative', () => {
      const data = {
        type: 'in',
        quantity: -5,
        inventoryItemId: 'item-1',
        createdBy: 'user-1',
      };

      expect(() => factory.createMovement(data as any)).toThrow(ZodError);
    });
  });
});
