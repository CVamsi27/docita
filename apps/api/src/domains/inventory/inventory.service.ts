import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { Prisma } from '@workspace/db';
import {
  IInventoryRepository,
  INVENTORY_REPOSITORY_TOKEN,
} from '@/domains/inventory/core/repositories/inventory.repository.interface';

@Injectable()
export class InventoryService {
  constructor(
    @Inject(INVENTORY_REPOSITORY_TOKEN)
    private readonly inventoryRepository: IInventoryRepository,
  ) {}

  async getItems(
    clinicId: string,
    filters: { search?: string; category?: string; status?: string },
  ) {
    const where: Prisma.InventoryItemWhereInput = { clinicId };
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { sku: { contains: filters.search, mode: 'insensitive' } },
        { supplier: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    if (filters.category && filters.category !== 'undefined')
      where.category = filters.category;
    if (filters.status === 'active') where.active = true;
    if (filters.status === 'inactive') where.active = false;

    const items = await this.inventoryRepository.findItems(where);

    if (filters.status === 'low_stock') {
      return items.filter((item) => item.quantity <= item.minQuantity);
    }

    return items;
  }

  async getStats(clinicId: string) {
    const items = await this.inventoryRepository.findItems({
      clinicId,
      active: true,
    });

    const now = new Date();
    const thirtyDaysFromNow = new Date(
      now.getTime() + 30 * 24 * 60 * 60 * 1000,
    );

    return {
      totalItems: items.length,
      totalStock: items.reduce((sum, item) => sum + item.quantity, 0),
      lowStock: items.filter(
        (item) => item.quantity <= item.minQuantity && item.quantity > 0,
      ).length,
      critical: items.filter((item) => item.quantity === 0).length,
      expiringSoon: items.filter(
        (item) =>
          item.expiryDate &&
          item.expiryDate <= thirtyDaysFromNow &&
          item.expiryDate > now,
      ).length,
    };
  }

  async getItemById(clinicId: string, id: string) {
    const item = await this.inventoryRepository.findItemById(id, clinicId);
    if (!item) throw new NotFoundException('Inventory item not found');
    return item;
  }

  async createItem(
    clinicId: string,
    userId: string,
    data: {
      name: string;
      category: string;
      quantity: number;
      minQuantity: number;
      unit: string;
      sku?: string;
      purchasePrice?: number;
      sellingPrice?: number;
      expiryDate?: string;
      batchNumber?: string;
      supplier?: string;
    },
  ) {
    return this.inventoryRepository.createItem({
      clinicId,
      name: data.name,
      category: data.category,
      quantity: data.quantity,
      minQuantity: data.minQuantity,
      unit: data.unit,
      sku: data.sku,
      purchasePrice: data.purchasePrice,
      sellingPrice: data.sellingPrice,
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
      batchNumber: data.batchNumber,
      supplier: data.supplier,
      active: true,
      movements: {
        create:
          data.quantity > 0
            ? [
                {
                  type: 'INITIAL',
                  quantity: data.quantity,
                  createdBy: userId,
                  notes: 'Initial stock',
                },
              ]
            : [],
      },
    });
  }

  async updateItem(
    clinicId: string,
    id: string,
    data: Partial<{
      name: string;
      category: string;
      quantity: number;
      minQuantity: number;
      unit: string;
      sku: string;
      purchasePrice: number;
      sellingPrice: number;
      expiryDate: string;
      batchNumber: string;
      supplier: string;
      active: boolean;
    }>,
  ) {
    const item = await this.inventoryRepository.findItemByClinic(id, clinicId);
    if (!item) throw new NotFoundException('Inventory item not found');

    return this.inventoryRepository.updateItem(id, {
      ...data,
      expiryDate:
        data.expiryDate !== undefined ? new Date(data.expiryDate) : undefined,
    });
  }

  async deleteItem(clinicId: string, id: string) {
    const item = await this.inventoryRepository.findItemByClinic(id, clinicId);
    if (!item) throw new NotFoundException('Inventory item not found');
    await this.inventoryRepository.updateItem(id, { active: false });
    return { success: true };
  }

  async addMovement(
    clinicId: string,
    itemId: string,
    userId: string,
    data: {
      type: string;
      quantity: number;
      referenceType?: string;
      referenceId?: string;
      notes?: string;
    },
  ) {
    const item = await this.inventoryRepository.findItemByClinic(
      itemId,
      clinicId,
    );
    if (!item) throw new NotFoundException('Inventory item not found');

    const outTypes = ['OUT', 'EXPIRED', 'WASTE'];
    const delta = outTypes.includes(data.type)
      ? -Math.abs(data.quantity)
      : Math.abs(data.quantity);

    return this.inventoryRepository.addMovementAndUpdateQuantity(
      itemId,
      {
        inventoryItem: { connect: { id: itemId } },
        type: data.type,
        quantity: data.quantity,
        referenceType: data.referenceType,
        referenceId: data.referenceId,
        notes: data.notes,
        createdBy: userId,
      },
      delta,
    );
  }
}
