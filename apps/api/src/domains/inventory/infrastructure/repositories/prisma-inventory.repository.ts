import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { toCents } from '@workspace/utils';
import { inventoryMovementDelta } from '@workspace/types';
import { PrismaService } from '@/prisma/prisma.service';
import {
  type CreateInventoryItemData,
  type CreateInventoryMovementData,
  IInventoryRepository,
  type InventoryItem,
  type InventoryItemFilters,
  InventoryItemWithMovements,
  type InventoryMovement,
  type InventoryReconciliation,
  type InventoryStats,
  type UpdateInventoryItemData,
} from '@/domains/inventory/core/repositories/inventory.repository.interface';
import { Prisma } from '@workspace/db';
import { isRecord } from '@workspace/utils';

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
        // Write both the legacy Float and the canonical cents columns (G3).
        purchasePrice: data.purchasePrice,
        sellingPrice: data.sellingPrice,
        purchasePriceCents: toCents(data.purchasePrice),
        sellingPriceCents: toCents(data.sellingPrice),
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
    // Keep the canonical cents columns in sync whenever a Float price is updated.
    const dataWithCents = {
      ...data,
      ...(data.purchasePrice !== undefined
        ? { purchasePriceCents: toCents(data.purchasePrice) }
        : {}),
      ...(data.sellingPrice !== undefined
        ? { sellingPriceCents: toCents(data.sellingPrice) }
        : {}),
    };
    const updateResult = await this.prisma.inventoryItem.updateMany({
      where: { id, clinicId },
      data: dataWithCents,
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

  async countMovements(itemId: string): Promise<number> {
    return this.getReadClient().inventoryMovement.count({
      where: { inventoryItemId: itemId },
    });
  }

  async reconcileLedger(clinicId: string): Promise<InventoryReconciliation[]> {
    // One aggregate over the clinic's items and their movements. The ledger
    // total applies the shared sign convention to every row, so it has to match
    // `InventoryItem.quantity` exactly when the ledger is authoritative.
    const items = await this.getReadClient().inventoryItem.findMany({
      where: { clinicId },
      select: {
        id: true,
        quantity: true,
        movements: { select: { type: true, quantity: true } },
      },
    });

    return items.map((item) => {
      const ledgerTotal = item.movements.reduce(
        (total, movement) =>
          total + inventoryMovementDelta(movement.type, movement.quantity),
        0,
      );
      return {
        itemId: item.id,
        stockQuantity: item.quantity,
        ledgerQuantity: ledgerTotal,
        drift: item.quantity - ledgerTotal,
      };
    });
  }

  async addMovementAndUpdateQuantity(
    itemId: string,
    clinicId: string,
    movementData: CreateInventoryMovementData,
    quantityDelta: number,
  ): Promise<InventoryMovement> {
    const { operationId, ...rest } = movementData;

    try {
      return await this.prisma.$transaction(async (tx) => {
        const where: Prisma.InventoryItemWhereInput = { id: itemId, clinicId };

        if (quantityDelta < 0) {
          where.quantity = { gte: Math.abs(quantityDelta) };
        }

        const updateResult = await tx.inventoryItem.updateMany({
          where,
          data: { quantity: { increment: quantityDelta } },
        });

        if (updateResult.count === 0) {
          const existing = await tx.inventoryItem.findUnique({
            where: { id: itemId },
            select: { quantity: true },
          });
          if (!existing) {
            throw new NotFoundException(`Inventory item ${itemId} not found`);
          }
          throw new BadRequestException(
            `Insufficient stock: requested ${Math.abs(quantityDelta)} but only ${existing.quantity} available`,
          );
        }

        const item = await tx.inventoryItem.findUniqueOrThrow({
          where: { id: itemId },
          select: { unit: true },
        });

        return tx.inventoryMovement.create({
          data: {
            inventoryItem: { connect: { id: itemId } },
            clinic: { connect: { id: clinicId } },
            ...rest,
            // Stamp the unit so the ledger stays self-describing after a
            // re-unitise instead of silently reinterpreting old rows.
            unit: item.unit,
            ...(operationId ? { operationId } : {}),
          },
        });
      });
    } catch (error) {
      // Operation identity: the unique (clinicId, operationId) index rejected
      // this retry. The whole transaction rolled back, so the quantity
      // increment never happened — returning the winning movement is what
      // makes a retried operation apply exactly once.
      if (!operationId || !isRecord(error) || error.code !== 'P2002') {
        throw error;
      }
      const existing = await this.getReadClient().inventoryMovement.findFirst({
        where: { clinicId, operationId },
      });
      if (!existing) throw error;
      return existing;
    }
  }
}
