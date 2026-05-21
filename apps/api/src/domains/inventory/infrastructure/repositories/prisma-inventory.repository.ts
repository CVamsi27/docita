import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  type CreateInventoryItemData,
  type CreateInventoryMovementData,
  IInventoryRepository,
  type InventoryItem,
  type InventoryItemFilters,
  InventoryItemWithMovements,
  type InventoryMovement,
  type InventoryStats,
  type UpdateInventoryItemData,
} from '@/domains/inventory/core/repositories/inventory.repository.interface';
import { Prisma } from '@workspace/db';

@Injectable()
export class PrismaInventoryRepository implements IInventoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getReadClient() {
    return this.prisma.getReadClient();
  }

  private buildItemWhere(filters: InventoryItemFilters) {
    const where: Prisma.InventoryItemWhereInput = {
      clinicId: filters.clinicId,
    };

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { sku: { contains: filters.search, mode: 'insensitive' } },
        { supplier: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    if (filters.category && filters.category !== 'undefined') {
      where.category = filters.category;
    }
    if (filters.status === 'active') where.active = true;
    if (filters.status === 'inactive') where.active = false;
    if (filters.status === 'low_stock') {
      where.quantity = {
        lte: this.prisma.inventoryItem.fields.minQuantity,
      };
    }

    return where;
  }

  async findItems(filters: InventoryItemFilters): Promise<InventoryItem[]> {
    return this.getReadClient().inventoryItem.findMany({
      where: this.buildItemWhere(filters),
      orderBy: { name: 'asc' },
    });
  }

  async getStats(clinicId: string, now: Date): Promise<InventoryStats> {
    const thirtyDaysFromNow = new Date(
      now.getTime() + 30 * 24 * 60 * 60 * 1000,
    );
    const activeWhere = { clinicId, active: true };

    const [totalItems, stock, lowStock, critical, expiringSoon] =
      await Promise.all([
        this.getReadClient().inventoryItem.count({ where: activeWhere }),
        this.getReadClient().inventoryItem.aggregate({
          where: activeWhere,
          _sum: { quantity: true },
        }),
        this.getReadClient().inventoryItem.count({
          where: {
            ...activeWhere,
            quantity: {
              gt: 0,
              lte: this.prisma.inventoryItem.fields.minQuantity,
            },
          },
        }),
        this.getReadClient().inventoryItem.count({
          where: { ...activeWhere, quantity: 0 },
        }),
        this.getReadClient().inventoryItem.count({
          where: {
            ...activeWhere,
            expiryDate: {
              gt: now,
              lte: thirtyDaysFromNow,
            },
          },
        }),
      ]);

    return {
      totalItems,
      totalStock: stock._sum.quantity ?? 0,
      lowStock,
      critical,
      expiringSoon,
    };
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

  async createItem(data: CreateInventoryItemData): Promise<InventoryItem> {
    return this.prisma.inventoryItem.create({
      data: {
        clinicId: data.clinicId,
        name: data.name,
        category: data.category,
        quantity: data.quantity,
        minQuantity: data.minQuantity,
        unit: data.unit,
        sku: data.sku,
        purchasePrice: data.purchasePrice,
        sellingPrice: data.sellingPrice,
        expiryDate: data.expiryDate,
        batchNumber: data.batchNumber,
        supplier: data.supplier,
        active: data.active,
        movements: data.initialMovement
          ? {
              create: {
                ...data.initialMovement,
                clinic: { connect: { id: data.clinicId } },
              },
            }
          : undefined,
      },
    });
  }

  async updateItem(
    id: string,
    data: UpdateInventoryItemData,
    clinicId: string,
  ): Promise<InventoryItem> {
    const updateResult = await this.prisma.inventoryItem.updateMany({
      where: { id, clinicId },
      data,
    });
    if (updateResult.count === 0) {
      throw new Error(`Inventory item ${id} not found`);
    }

    const updated = await this.prisma.inventoryItem.findFirst({
      where: { id, clinicId },
    });
    if (!updated) {
      throw new Error(`Inventory item ${id} not found`);
    }

    return updated;
  }

  async addMovementAndUpdateQuantity(
    itemId: string,
    clinicId: string,
    movementData: CreateInventoryMovementData,
    quantityDelta: number,
  ): Promise<InventoryMovement> {
    return this.prisma.$transaction(async (tx) => {
      const updateResult = await tx.inventoryItem.updateMany({
        where: { id: itemId, clinicId },
        data: { quantity: { increment: quantityDelta } },
      });

      if (updateResult.count === 0) {
        throw new Error(`Inventory item ${itemId} not found`);
      }

      return tx.inventoryMovement.create({
        data: {
          inventoryItem: { connect: { id: itemId } },
          clinic: { connect: { id: clinicId } },
          ...movementData,
        },
      });
    });
  }
}
