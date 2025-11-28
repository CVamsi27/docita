import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface CreateInventoryItemDto {
  name: string;
  category: string;
  sku?: string;
  quantity?: number;
  minQuantity?: number;
  unit?: string;
  purchasePrice?: number;
  sellingPrice?: number;
  expiryDate?: Date;
  batchNumber?: string;
  supplier?: string;
}

interface UpdateInventoryItemDto {
  name?: string;
  category?: string;
  sku?: string;
  quantity?: number;
  minQuantity?: number;
  unit?: string;
  purchasePrice?: number;
  sellingPrice?: number;
  expiryDate?: Date;
  batchNumber?: string;
  supplier?: string;
  active?: boolean;
}

interface CreateMovementDto {
  type: string;
  quantity: number;
  referenceType?: string;
  referenceId?: string;
  notes?: string;
}

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async findAll(clinicId: string) {
    if (!clinicId) {
      return [];
    }

    return this.prisma.inventoryItem.findMany({
      where: { clinicId, active: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.inventoryItem.findUnique({
      where: { id },
      include: {
        movements: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!item) {
      throw new NotFoundException(`Inventory item with ID ${id} not found`);
    }

    return item;
  }

  async create(clinicId: string, data: CreateInventoryItemDto) {
    return this.prisma.inventoryItem.create({
      data: {
        clinicId,
        ...data,
      },
    });
  }

  async update(id: string, data: UpdateInventoryItemDto) {
    return this.prisma.inventoryItem.update({
      where: { id },
      data,
    });
  }

  async addMovement(itemId: string, userId: string, data: CreateMovementDto) {
    const item = await this.prisma.inventoryItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      throw new NotFoundException(`Inventory item with ID ${itemId} not found`);
    }

    // Calculate new quantity based on movement type
    let newQuantity = item.quantity;
    if (data.type === 'in') {
      newQuantity += data.quantity;
    } else if (data.type === 'out') {
      newQuantity -= data.quantity;
    } else if (data.type === 'adjustment') {
      newQuantity = data.quantity;
    } else if (data.type === 'expired') {
      newQuantity -= data.quantity;
    }

    // Use transaction to create movement and update quantity
    const [movement] = await this.prisma.$transaction([
      this.prisma.inventoryMovement.create({
        data: {
          inventoryItemId: itemId,
          type: data.type,
          quantity: data.quantity,
          referenceType: data.referenceType,
          referenceId: data.referenceId,
          notes: data.notes,
          createdBy: userId,
        },
      }),
      this.prisma.inventoryItem.update({
        where: { id: itemId },
        data: { quantity: newQuantity },
      }),
    ]);

    return movement;
  }

  async getStats(clinicId: string) {
    if (!clinicId) {
      return {
        totalItems: 0,
        totalStock: 0,
        lowStock: 0,
        critical: 0,
        expiringSoon: 0,
      };
    }

    const items = await this.prisma.inventoryItem.findMany({
      where: { clinicId, active: true },
    });

    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    return {
      totalItems: items.length,
      totalStock: items.reduce((sum, item) => sum + item.quantity, 0),
      lowStock: items.filter((item) => item.quantity <= item.minQuantity)
        .length,
      critical: items.filter((item) => item.quantity <= item.minQuantity * 0.5)
        .length,
      expiringSoon: items.filter((item) => {
        if (!item.expiryDate) return false;
        return item.expiryDate >= now && item.expiryDate <= thirtyDaysFromNow;
      }).length,
    };
  }

  async getLowStockItems(clinicId: string) {
    if (!clinicId) {
      return [];
    }

    const items = await this.prisma.inventoryItem.findMany({
      where: { clinicId, active: true },
    });

    return items.filter((item) => item.quantity <= item.minQuantity);
  }

  async getExpiringItems(clinicId: string, days: number = 30) {
    if (!clinicId) {
      return [];
    }

    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return this.prisma.inventoryItem.findMany({
      where: {
        clinicId,
        active: true,
        expiryDate: {
          gte: now,
          lte: futureDate,
        },
      },
      orderBy: { expiryDate: 'asc' },
    });
  }
}
