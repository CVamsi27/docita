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

  async findItems(
    where: Prisma.InventoryItemWhereInput,
  ): Promise<InventoryItem[]> {
    return this.prisma.inventoryItem.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async findItemById(
    id: string,
    clinicId: string,
  ): Promise<InventoryItemWithMovements | null> {
    return this.prisma.inventoryItem.findFirst({
      where: { id, clinicId },
      include: { movements: { orderBy: { createdAt: 'desc' }, take: 20 } },
    });
  }

  async findItemByClinic(
    id: string,
    clinicId: string,
  ): Promise<InventoryItem | null> {
    return this.prisma.inventoryItem.findFirst({ where: { id, clinicId } });
  }

  async createItem(
    data: Prisma.InventoryItemCreateInput,
  ): Promise<InventoryItem> {
    return this.prisma.inventoryItem.create({ data });
  }

  async updateItem(
    id: string,
    data: Prisma.InventoryItemUpdateInput,
  ): Promise<InventoryItem> {
    return this.prisma.inventoryItem.update({ where: { id }, data });
  }

  async addMovementAndUpdateQuantity(
    itemId: string,
    movementData: Prisma.InventoryMovementCreateInput,
    quantityDelta: number,
  ): Promise<InventoryMovement> {
    const [movement] = await this.prisma.$transaction([
      this.prisma.inventoryMovement.create({ data: movementData }),
      this.prisma.inventoryItem.update({
        where: { id: itemId },
        data: { quantity: { increment: quantityDelta } },
      }),
    ]);

    return movement;
  }
}
