import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InventoryFactory } from './factories/inventory.factory';

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
  constructor(
    private prisma: PrismaService,
    private inventoryFactory: InventoryFactory,
  ) {}

  async findAll(
    clinicId: string,
    params?: { search?: string; category?: string; status?: string },
  ) {
    if (!clinicId) {
      return [];
    }

    const { search, category, status } = params || {};

    const whereCallback: Record<string, unknown> = {
      clinicId,
      active: true,
    };

    if (search) {
      whereCallback.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (category && category !== 'all') {
      whereCallback.category = category;
    }

    // Fetch items matching search and category
    let items = await this.prisma.inventoryItem.findMany({
      where: whereCallback,
      orderBy: { name: 'asc' },
    });

    // Filter by stock status if provided
    if (status && status !== 'all') {
      items = items.filter((item) => {
        if (status === 'critical') {
          return item.quantity <= item.minQuantity * 0.5;
        }
        if (status === 'low') {
          return (
            item.quantity <= item.minQuantity &&
            item.quantity > item.minQuantity * 0.5
          );
        }
        if (status === 'low_critical') {
          return item.quantity <= item.minQuantity;
        }
        if (status === 'in_stock') {
          return item.quantity > item.minQuantity;
        }
        return true;
      });
    }

    return items;
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
    const validatedData = this.inventoryFactory.createItem({
      clinicId,
      ...data,
    });

    return this.prisma.inventoryItem.create({
      data: validatedData,
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

    const validatedMovement = this.inventoryFactory.createMovement({
      inventoryItemId: itemId,
      createdBy: userId,
      type: data.type as any,
      quantity: data.quantity,
      referenceType: data.referenceType,
      referenceId: data.referenceId,
      notes: data.notes,
    });

    // Calculate new quantity based on movement type
    let newQuantity = item.quantity;
    if (validatedMovement.type === 'in') {
      newQuantity += validatedMovement.quantity;
    } else if (validatedMovement.type === 'out') {
      newQuantity -= validatedMovement.quantity;
    } else if (validatedMovement.type === 'adjustment') {
      newQuantity = validatedMovement.quantity;
    } else if (validatedMovement.type === 'expired') {
      newQuantity -= validatedMovement.quantity;
    }

    // Use transaction to create movement and update quantity
    const [movement] = await this.prisma.$transaction([
      this.prisma.inventoryMovement.create({
        data: validatedMovement,
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
