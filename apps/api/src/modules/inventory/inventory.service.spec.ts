import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from './inventory.service';
import { PrismaService } from '../../prisma/prisma.service';
import { InventoryFactory } from './factories/inventory.factory';
import { NotFoundException } from '@nestjs/common';

describe('InventoryService', () => {
  let service: InventoryService;
  let prisma: PrismaService;
  let factory: InventoryFactory;

  const mockItem = {
    id: 'item-1',
    name: 'Paracetamol',
    category: 'Medicine',
    quantity: 10,
    minQuantity: 5,
    clinicId: 'clinic-1',
    active: true,
  };

  const mockPrismaService = {
    inventoryItem: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    inventoryMovement: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockFactory = {
    createItem: jest.fn(),
    createMovement: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: InventoryFactory, useValue: mockFactory },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
    prisma = module.get<PrismaService>(PrismaService);
    factory = module.get<InventoryFactory>(InventoryFactory);

    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return empty array if no clinicId', async () => {
      const result = await service.findAll('');
      expect(result).toEqual([]);
    });

    it('should return items for clinic', async () => {
      mockPrismaService.inventoryItem.findMany.mockResolvedValue([mockItem]);
      const result = await service.findAll('clinic-1');
      expect(result).toEqual([mockItem]);
    });
  });

  describe('create', () => {
    it('should create item using factory', async () => {
      const input = { name: 'Item', category: 'Cat' };
      const validated = { ...input, clinicId: 'clinic-1', active: true };

      mockFactory.createItem.mockReturnValue(validated);
      mockPrismaService.inventoryItem.create.mockResolvedValue({
        id: 'new-id',
        ...validated,
      });

      const result = await service.create('clinic-1', input as any);

      expect(factory.createItem).toHaveBeenCalledWith({
        clinicId: 'clinic-1',
        ...input,
      });
      expect(result.id).toBe('new-id');
    });
  });

  describe('addMovement', () => {
    it('should add movement and update quantity', async () => {
      const movementData = {
        type: 'in',
        quantity: 5,
      };

      mockPrismaService.inventoryItem.findUnique.mockResolvedValue(mockItem);
      mockFactory.createMovement.mockReturnValue({
        ...movementData,
        inventoryItemId: 'item-1',
      });
      mockPrismaService.$transaction.mockResolvedValue([
        { id: 'mov-1', ...movementData },
        { ...mockItem, quantity: 15 },
      ]);

      const result = await service.addMovement(
        'item-1',
        'user-1',
        movementData as any,
      );

      expect(factory.createMovement).toHaveBeenCalled();
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(result.id).toBe('mov-1');
    });

    it('should throw NotFoundException if item not found', async () => {
      mockPrismaService.inventoryItem.findUnique.mockResolvedValue(null);
      await expect(
        service.addMovement('invalid', 'user-1', {} as any),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
