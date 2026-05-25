import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { PrismaInventoryRepository } from './prisma-inventory.repository';
import { PrismaService } from '@/prisma/prisma.service';

type AnyAsync = (...args: unknown[]) => Promise<unknown>;

describe('PrismaInventoryRepository tenant guards', () => {
  const readClient = {
    inventoryItem: {
      findFirst: jest.fn<AnyAsync>(),
      findMany: jest.fn<AnyAsync>(),
    },
  };

  const writeClient = {
    inventoryItem: {
      updateMany: jest.fn<AnyAsync>(),
      findFirst: jest.fn<AnyAsync>(),
    },
    inventoryMovement: {
      create: jest.fn<AnyAsync>(),
    },
    $transaction: jest.fn<AnyAsync>(),
  };

  let repository: PrismaInventoryRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    const prismaService = Object.create(
      PrismaService.prototype,
    ) as PrismaService;
    Object.defineProperties(prismaService, {
      getReadClient: { value: () => readClient, writable: true },
      inventoryItem: { value: writeClient.inventoryItem, writable: true },
      inventoryMovement: {
        value: writeClient.inventoryMovement,
        writable: true,
      },
      $transaction: { value: writeClient.$transaction, writable: true },
    });
    repository = new PrismaInventoryRepository(prismaService);
  });

  it('updateItem rejects cross-tenant ids with NotFound semantics', async () => {
    writeClient.inventoryItem.updateMany.mockResolvedValueOnce({ count: 0 });

    await expect(
      repository.updateItem('item-1', { quantity: 5 } as never, 'other-clinic'),
    ).rejects.toThrow('Inventory item item-1 not found');

    expect(writeClient.inventoryItem.updateMany).toHaveBeenCalledWith({
      where: { id: 'item-1', clinicId: 'other-clinic' },
      data: expect.any(Object),
    });
  });

  it('addMovementAndUpdateQuantity throws when item is in another tenant', async () => {
    writeClient.inventoryItem.updateMany.mockResolvedValueOnce({ count: 0 });
    writeClient.$transaction.mockImplementationOnce(async (callback) =>
      (callback as (tx: typeof writeClient) => Promise<unknown>)(writeClient),
    );

    await expect(
      repository.addMovementAndUpdateQuantity(
        'item-1',
        'other-clinic',
        { type: 'IN', quantity: 5, createdBy: 'user-1' },
        5,
      ),
    ).rejects.toThrow('Inventory item item-1 not found');

    expect(writeClient.inventoryMovement.create).not.toHaveBeenCalled();
  });
});
