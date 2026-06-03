import { Injectable, Inject } from '@nestjs/common';
import {
  IInventoryRepository,
  INVENTORY_REPOSITORY_TOKEN,
  type CreateInventoryMovementData,
} from '@/domains/inventory/core/repositories/inventory.repository.interface';

@Injectable()
export class InventoryCommandService {
  constructor(
    @Inject(INVENTORY_REPOSITORY_TOKEN)
    private readonly inventoryRepository: IInventoryRepository,
  ) {}

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
      initialMovement:
        data.quantity > 0
          ? {
              type: 'INITIAL',
              quantity: data.quantity,
              createdBy: userId,
              notes: 'Initial stock',
            }
          : undefined,
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

    return this.inventoryRepository.updateItem(
      id,
      {
        ...data,
        expiryDate:
          data.expiryDate !== undefined ? new Date(data.expiryDate) : undefined,
      },
      clinicId,
    );
  }

  async deleteItem(clinicId: string, id: string) {
    const item = await this.inventoryRepository.findItemByClinic(id, clinicId);
    if (!item) throw new NotFoundException('Inventory item not found');
    await this.inventoryRepository.updateItem(id, { active: false }, clinicId);
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
    const outTypes = ['OUT', 'EXPIRED', 'WASTE'];
    const delta = outTypes.includes(data.type)
      ? -Math.abs(data.quantity)
      : Math.abs(data.quantity);

    const movementData: CreateInventoryMovementData = {
      type: data.type,
      quantity: data.quantity,
      referenceType: data.referenceType,
      referenceId: data.referenceId,
      notes: data.notes,
      createdBy: userId,
    };

    return this.inventoryRepository.addMovementAndUpdateQuantity(
      itemId,
      clinicId,
      movementData,
      delta,
    );
  }
}
