import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { inventoryMovementDelta } from '@workspace/types';
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
    userId: string,
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

    if (data.unit !== undefined && data.unit !== item.unit) {
      // Re-unitising an item that already has movements would silently
      // reinterpret every historical quantity, so the ledger would no longer
      // describe what was counted.
      const movements = await this.inventoryRepository.countMovements(id);
      if (movements > 0) {
        throw new ConflictException(
          'Unit cannot be changed once the item has recorded movements, because existing history would be reinterpreted. Record an adjustment and add a new item instead.',
        );
      }
    }

    const { quantity, ...metadata } = data;
    const metadataUpdate = {
      ...metadata,
      expiryDate:
        metadata.expiryDate !== undefined
          ? new Date(metadata.expiryDate)
          : undefined,
    };

    // The ledger is authoritative for stock (backlog W03): a balance edit is
    // recorded as an ADJUSTMENT movement rather than written straight to
    // `quantity`, so the ledger still reconstructs the balance. Applying the
    // correction through the movement path also keeps the existing
    // "never go negative" guard that a direct write bypassed. A movement
    // records a positive magnitude and its type carries the sign, so a
    // downward correction is recorded as `ADJUSTMENT_OUT` — recording it as
    // `ADJUSTMENT` would make the ledger reconstruct it as an increase.
    if (quantity !== undefined && quantity !== item.quantity) {
      // The DTO enforces a non-negative target at the HTTP boundary, but the
      // invariant must hold for every caller rather than only that one.
      if (quantity < 0) {
        throw new BadRequestException('Quantity cannot be negative');
      }

      const delta = quantity - item.quantity;
      await this.inventoryRepository.addMovementAndUpdateQuantity(
        id,
        clinicId,
        {
          type: delta < 0 ? 'ADJUSTMENT_OUT' : 'ADJUSTMENT',
          quantity: Math.abs(delta),
          notes:
            'Balance corrected from the item editor; recorded as an adjustment so the ledger stays authoritative',
          createdBy: userId,
        },
        delta,
      );
    }

    return this.inventoryRepository.updateItem(id, metadataUpdate, clinicId);
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
      operationId?: string;
      notes?: string;
    },
  ) {
    const delta = inventoryMovementDelta(data.type, data.quantity);

    const movementData: CreateInventoryMovementData = {
      type: data.type,
      quantity: data.quantity,
      referenceType: data.referenceType,
      referenceId: data.referenceId,
      operationId: data.operationId,
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
