import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { INVENTORY_REPOSITORY_TOKEN } from './core/repositories/inventory.repository.interface';
import { beforeEach, describe, it, expect, jest } from '@jest/globals';

describe('InventoryService', () => {
  let service: InventoryService;
  let repo: Record<string, jest.Mock<(...args: unknown[]) => Promise<unknown>>>;

  const mockItem = {
    id: 'item-1',
    clinicId: 'clinic-1',
    name: 'Paracetamol',
    category: 'MEDICINE',
    quantity: 100,
    minQuantity: 10,
    unit: 'tablets',
    sku: 'PARA-500',
    purchasePrice: null,
    sellingPrice: null,
    expiryDate: null,
    batchNumber: null,
    supplier: null,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    movements: [],
  };

  beforeEach(async () => {
    repo = {
      findItems: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      findItemById: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      findItemByClinic: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      createItem: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      updateItem: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      addMovementAndUpdateQuantity:
        jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: INVENTORY_REPOSITORY_TOKEN, useValue: repo },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
  });

  describe('getItems', () => {
    it('returns all items for a clinic', async () => {
      repo.findItems.mockResolvedValue([mockItem]);

      const result = await service.getItems('clinic-1', {});

      expect(repo.findItems).toHaveBeenCalledWith(
        expect.objectContaining({ clinicId: 'clinic-1' }),
      );
      expect(result).toHaveLength(1);
    });

    it('filters low stock items', async () => {
      const lowStockItem = { ...mockItem, quantity: 5, minQuantity: 10 };
      const normalItem = { ...mockItem, id: 'item-2', quantity: 50 };
      repo.findItems.mockResolvedValue([lowStockItem, normalItem]);

      const result = await service.getItems('clinic-1', {
        status: 'low_stock',
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('item-1');
    });
  });

  describe('getStats', () => {
    it('returns inventory statistics', async () => {
      const items = [
        {
          ...mockItem,
          quantity: 0,
          minQuantity: 5,
          active: true,
          expiryDate: null,
        },
        {
          ...mockItem,
          id: 'item-2',
          quantity: 3,
          minQuantity: 5,
          active: true,
          expiryDate: null,
        },
      ];
      repo.findItems.mockResolvedValue(items);

      const result = await service.getStats('clinic-1');

      expect(result.totalItems).toBe(2);
      expect(result.critical).toBe(1);
      expect(result.lowStock).toBe(1);
    });
  });

  describe('getItemById', () => {
    it('returns item by id', async () => {
      repo.findItemById.mockResolvedValue(mockItem);

      const result = await service.getItemById('clinic-1', 'item-1');
      expect(result.id).toBe('item-1');
    });

    it('throws NotFoundException when item not found', async () => {
      repo.findItemById.mockResolvedValue(null);

      await expect(
        service.getItemById('clinic-1', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createItem', () => {
    it('creates an inventory item', async () => {
      repo.createItem.mockResolvedValue(mockItem);

      const result = await service.createItem('clinic-1', 'user-1', {
        name: 'Paracetamol',
        category: 'MEDICINE',
        quantity: 100,
        minQuantity: 10,
        unit: 'tablets',
      });

      expect(repo.createItem).toHaveBeenCalled();
      expect(result.id).toBe('item-1');
    });
  });

  describe('updateItem', () => {
    it('throws NotFoundException when item not found', async () => {
      repo.findItemByClinic.mockResolvedValue(null);

      await expect(
        service.updateItem('clinic-1', 'nonexistent', { name: 'Updated' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('updates an item', async () => {
      repo.findItemByClinic.mockResolvedValue(mockItem);
      repo.updateItem.mockResolvedValue({ ...mockItem, name: 'Updated' });

      const result = await service.updateItem('clinic-1', 'item-1', {
        name: 'Updated',
      });
      expect(result.name).toBe('Updated');
    });
  });

  describe('addMovement', () => {
    it('throws NotFoundException when item not found', async () => {
      repo.findItemByClinic.mockResolvedValue(null);

      await expect(
        service.addMovement('clinic-1', 'nonexistent', 'user-1', {
          type: 'IN',
          quantity: 10,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('creates a movement and updates quantity', async () => {
      const mockMovement = { id: 'mov-1', type: 'IN', quantity: 10 };
      repo.findItemByClinic.mockResolvedValue(mockItem);
      repo.addMovementAndUpdateQuantity.mockResolvedValue(mockMovement);

      const result = await service.addMovement('clinic-1', 'item-1', 'user-1', {
        type: 'IN',
        quantity: 10,
      });

      expect(repo.addMovementAndUpdateQuantity).toHaveBeenCalledWith(
        'item-1',
        'clinic-1',
        expect.objectContaining({ type: 'IN', quantity: 10 }),
        10,
      );
      expect(result.id).toBe('mov-1');
    });

    it('uses negative delta for OUT movements', async () => {
      repo.findItemByClinic.mockResolvedValue(mockItem);
      repo.addMovementAndUpdateQuantity.mockResolvedValue({});

      await service.addMovement('clinic-1', 'item-1', 'user-1', {
        type: 'OUT',
        quantity: 5,
      });

      expect(repo.addMovementAndUpdateQuantity).toHaveBeenCalledWith(
        'item-1',
        'clinic-1',
        expect.anything(),
        -5,
      );
    });
  });
});
