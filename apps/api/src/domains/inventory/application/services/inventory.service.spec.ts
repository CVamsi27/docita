import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryCommandService } from './inventory-command.service';
import { InventoryQueryService } from './inventory-query.service';
import { INVENTORY_REPOSITORY_TOKEN } from '../../core/repositories/inventory.repository.interface';
import { CLOCK_PORT } from '@/shared/common/ports/clock.port';
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
      getStats: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      findItemById: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      findItemByClinic: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      createItem: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      updateItem: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      countMovements: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      reconcileLedger: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      addMovementAndUpdateQuantity:
        jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryCommandService,
        InventoryQueryService,
        InventoryService,
        { provide: INVENTORY_REPOSITORY_TOKEN, useValue: repo },
        {
          provide: CLOCK_PORT,
          useValue: { now: () => new Date('2026-04-01T12:00:00.000Z') },
        },
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

    it('passes low stock filters to the repository', async () => {
      const lowStockItem = { ...mockItem, quantity: 5, minQuantity: 10 };
      repo.findItems.mockResolvedValue([lowStockItem]);

      const result = await service.getItems('clinic-1', {
        status: 'low_stock',
      });
      expect(repo.findItems).toHaveBeenCalledWith({
        clinicId: 'clinic-1',
        status: 'low_stock',
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('item-1');
    });
  });

  describe('getStats', () => {
    it('returns inventory statistics', async () => {
      repo.getStats.mockResolvedValue({
        totalItems: 2,
        totalStock: 3,
        lowStock: 1,
        critical: 1,
        expiringSoon: 0,
      });

      const result = await service.getStats('clinic-1');

      expect(repo.getStats).toHaveBeenCalledWith(
        'clinic-1',
        new Date('2026-04-01T12:00:00.000Z'),
      );
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
    beforeEach(() => {
      repo.countMovements.mockResolvedValue(0);
      repo.addMovementAndUpdateQuantity.mockResolvedValue({ id: 'mov-1' });
    });

    it('throws NotFoundException when item not found', async () => {
      repo.findItemByClinic.mockResolvedValue(null);

      await expect(
        service.updateItem('clinic-1', 'nonexistent', 'user-1', {
          name: 'Updated',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    describe('deleteItem (soft delete)', () => {
      it('flips the item to active: false rather than removing the row', async () => {
        repo.findItemByClinic.mockResolvedValue({ id: 'item-1' });
        repo.updateItem.mockResolvedValue({ id: 'item-1', active: false });

        const result = await service.deleteItem('clinic-1', 'item-1');

        // Soft-delete: updateItem is called with { active: false }, not a
        // repository delete. The row stays for stock-movement history and
        // audit; the listing query filters active items only.
        expect(repo.updateItem).toHaveBeenCalledWith(
          'item-1',
          { active: false },
          'clinic-1',
        );
        expect(result).toEqual({ success: true });
      });

      it('throws NotFoundException when the item is not in the clinic', async () => {
        repo.findItemByClinic.mockResolvedValue(null);

        await expect(
          service.deleteItem('clinic-1', 'nonexistent'),
        ).rejects.toThrow(NotFoundException);
        expect(repo.updateItem).not.toHaveBeenCalled();
      });
    });

    it('updates an item', async () => {
      repo.findItemByClinic.mockResolvedValue(mockItem);
      repo.updateItem.mockResolvedValue({ ...mockItem, name: 'Updated' });

      const result = await service.updateItem('clinic-1', 'item-1', 'user-1', {
        name: 'Updated',
      });
      expect(result.name).toBe('Updated');
    });

    // W03: the ledger is authoritative for stock, so a balance edit has to
    // leave an auditable movement rather than write `quantity` directly. A
    // downward correction has to be distinguishable from an upward one, or the
    // ledger would reconstruct it with the wrong sign.
    it('records a downward balance edit as an ADJUSTMENT_OUT movement', async () => {
      repo.findItemByClinic.mockResolvedValue({ ...mockItem, quantity: 100 });
      repo.updateItem.mockResolvedValue({ ...mockItem, quantity: 70 });

      await service.updateItem('clinic-1', 'item-1', 'user-1', {
        quantity: 70,
      });

      expect(repo.addMovementAndUpdateQuantity).toHaveBeenCalledWith(
        'item-1',
        'clinic-1',
        expect.objectContaining({ type: 'ADJUSTMENT_OUT', quantity: 30 }),
        -30,
      );
      // The balance itself is never handed to the metadata update.
      expect(repo.updateItem).toHaveBeenCalledWith(
        'item-1',
        expect.not.objectContaining({ quantity: expect.anything() }),
        'clinic-1',
      );
    });

    it('records an increase as a positive adjustment', async () => {
      repo.findItemByClinic.mockResolvedValue({ ...mockItem, quantity: 100 });
      repo.updateItem.mockResolvedValue({ ...mockItem, quantity: 140 });

      await service.updateItem('clinic-1', 'item-1', 'user-1', {
        quantity: 140,
      });

      expect(repo.addMovementAndUpdateQuantity).toHaveBeenCalledWith(
        'item-1',
        'clinic-1',
        expect.objectContaining({ type: 'ADJUSTMENT', quantity: 40 }),
        40,
      );
    });

    it('does not record a movement when the balance is unchanged', async () => {
      repo.findItemByClinic.mockResolvedValue({ ...mockItem, quantity: 100 });
      repo.updateItem.mockResolvedValue(mockItem);

      await service.updateItem('clinic-1', 'item-1', 'user-1', {
        quantity: 100,
      });

      expect(repo.addMovementAndUpdateQuantity).not.toHaveBeenCalled();
    });

    it('applies metadata and the correction together when both are supplied', async () => {
      repo.findItemByClinic.mockResolvedValue({ ...mockItem, quantity: 100 });
      repo.updateItem.mockResolvedValue({ ...mockItem, quantity: 90 });

      await service.updateItem('clinic-1', 'item-1', 'user-1', {
        quantity: 90,
        name: 'Renamed',
      });

      expect(repo.addMovementAndUpdateQuantity).toHaveBeenCalled();
      expect(repo.updateItem).toHaveBeenCalledWith(
        'item-1',
        { name: 'Renamed', expiryDate: undefined },
        'clinic-1',
      );
    });

    it('refuses to change the unit once the item has recorded movements', async () => {
      repo.findItemByClinic.mockResolvedValue({ ...mockItem, unit: 'tablets' });
      repo.countMovements.mockResolvedValue(3);

      await expect(
        service.updateItem('clinic-1', 'item-1', 'user-1', {
          unit: 'capsules',
        }),
      ).rejects.toThrow(ConflictException);
      expect(repo.updateItem).not.toHaveBeenCalled();
    });

    it('allows a unit change before any movement exists', async () => {
      repo.findItemByClinic.mockResolvedValue({ ...mockItem, unit: 'tablets' });
      repo.countMovements.mockResolvedValue(0);
      repo.updateItem.mockResolvedValue({ ...mockItem, unit: 'capsules' });

      const result = await service.updateItem('clinic-1', 'item-1', 'user-1', {
        unit: 'capsules',
      });

      expect(result.unit).toBe('capsules');
    });

    it('allows a no-op unit change once movements exist', async () => {
      repo.findItemByClinic.mockResolvedValue({ ...mockItem, unit: 'tablets' });
      repo.countMovements.mockResolvedValue(3);
      repo.updateItem.mockResolvedValue(mockItem);

      await service.updateItem('clinic-1', 'item-1', 'user-1', {
        unit: 'tablets',
      });

      expect(repo.updateItem).toHaveBeenCalled();
    });
  });

  describe('addMovement', () => {
    it('throws NotFoundException when repository rejects', async () => {
      repo.addMovementAndUpdateQuantity.mockRejectedValue(
        new NotFoundException('Inventory item nonexistent not found'),
      );

      await expect(
        service.addMovement('clinic-1', 'nonexistent', 'user-1', {
          type: 'IN',
          quantity: 10,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('creates a movement and updates quantity', async () => {
      const mockMovement = { id: 'mov-1', type: 'IN', quantity: 10 };
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

    it('throws BadRequestException on insufficient stock', async () => {
      const { BadRequestException } = await import('@nestjs/common');
      repo.addMovementAndUpdateQuantity.mockRejectedValue(
        new BadRequestException('Insufficient stock'),
      );

      await expect(
        service.addMovement('clinic-1', 'item-1', 'user-1', {
          type: 'OUT',
          quantity: 999,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('forwards the operation identity so a retry applies once', async () => {
      repo.addMovementAndUpdateQuantity.mockResolvedValue({});

      await service.addMovement('clinic-1', 'item-1', 'user-1', {
        type: 'IN',
        quantity: 40,
        operationId: 'po-8821-line-3',
      });

      expect(repo.addMovementAndUpdateQuantity).toHaveBeenCalledWith(
        'item-1',
        'clinic-1',
        expect.objectContaining({ operationId: 'po-8821-line-3' }),
        40,
      );
    });

    it('treats EXPIRED and WASTE as outflows', async () => {
      repo.addMovementAndUpdateQuantity.mockResolvedValue({});

      await service.addMovement('clinic-1', 'item-1', 'user-1', {
        type: 'EXPIRED',
        quantity: 4,
      });
      await service.addMovement('clinic-1', 'item-1', 'user-1', {
        type: 'WASTE',
        quantity: 4,
      });

      const deltas = repo.addMovementAndUpdateQuantity.mock.calls.map(
        (call) => call[3],
      );
      expect(deltas).toEqual([-4, -4]);
    });
  });
});
