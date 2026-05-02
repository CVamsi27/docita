import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  IInventoryRepository,
  InventoryItemWithMovements,
} from '@/domains/inventory/core/repositories/inventory.repository.interface';
import { InventoryItem, InventoryMovement, Prisma } from '@workspace/db';

@Injectable()
export class PrismaInventoryRepository implements IInventoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getReadClient() {
    return this.prisma.getReadClient();
  }

  async findItems(
    where: Prisma.InventoryItemWhereInput,
  ): Promise<InventoryItem[]> {
    return this.getReadClient().inventoryItem.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async findItemById(
    id: string,
    clinicId: string,
  ): Promise<InventoryItemWithMovements | null> {
    return this.getReadClient().inventoryItem.findFirst({
      where: { id, clinicId },
      include: { movements: { orderBy: { createdAt: 'desc' }, take: 20 } },
    });
  }

  async findItemByClinic(
    id: string,
    clinicId: string,
  ): Promise<InventoryItem | null> {
    return this.getReadClient().inventoryItem.findFirst({
      where: { id, clinicId },
    });
  }

  async createItem(
    data: Prisma.InventoryItemCreateInput,
  ): Promise<InventoryItem> {
    return this.prisma.inventoryItem.create({ data });
  }

  async updateItem(
    id: string,
    data: Prisma.InventoryItemUpdateInput,
    clinicId: string,
  ): Promise<InventoryItem> {
    const result = await this.prisma.inventoryItem.updateMany({
      where: { id, clinicId },
      data: data as Prisma.InventoryItemUpdateManyMutationInput,
    });
    if (result.count === 0) {
      throw new Error(`Inventory item ${id} not found`);
    }
    const refreshed = await this.prisma.inventoryItem.findFirst({
      where: { id, clinicId },
    });
    if (!refreshed) {
      throw new Error(`Inventory item ${id} not found`);
    }
    return refreshed;
  }

  async addMovementAndUpdateQuantity(
    itemId: string,
    clinicId: string,
    movementData: Prisma.InventoryMovementCreateInput,
    quantityDelta: number,
  ): Promise<InventoryMovement> {
    const [movement, updateResult] = await this.prisma.$transaction([
      this.prisma.inventoryMovement.create({ data: movementData }),
      this.prisma.inventoryItem.updateMany({
        where: { id: itemId, clinicId },
        data: { quantity: { increment: quantityDelta } },
      }),
    ]);

    if (updateResult.count === 0) {
      throw new Error(`Inventory item ${itemId} not found`);
    }

    return movement;
  }
}
