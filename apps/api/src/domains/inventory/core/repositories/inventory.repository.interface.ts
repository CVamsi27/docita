import type { InventoryItem } from '../entities/inventory-item.entity';

export interface InventoryMovement {
  id: string;
  inventoryItemId: string;
  clinicId: string | null;
  type: string;
  quantity: number;
  referenceType: string | null;
  referenceId: string | null;
  notes: string | null;
  createdBy: string;
  createdAt: Date;
}

export { type InventoryItem } from '../entities/inventory-item.entity';

export type InventoryItemWithMovements = InventoryItem & {
  movements: InventoryMovement[];
};

export interface InventoryItemFilters {
  clinicId: string;
  search?: string;
  category?: string;
  status?: string;
}

export interface InventoryStats {
  totalItems: number;
  totalStock: number;
  lowStock: number;
  critical: number;
  expiringSoon: number;
}

export interface CreateInventoryMovementData {
  type: string;
  quantity: number;
  referenceType?: string;
  referenceId?: string;
  notes?: string;
  createdBy: string;
}

export interface CreateInventoryItemData {
  clinicId: string;
  name: string;
  category: string;
  quantity: number;
  minQuantity: number;
  unit: string;
  sku?: string;
  purchasePrice?: number;
  sellingPrice?: number;
  expiryDate?: Date | null;
  batchNumber?: string;
  supplier?: string;
  active: boolean;
  initialMovement?: CreateInventoryMovementData;
}

export interface UpdateInventoryItemData {
  name?: string;
  category?: string;
  quantity?: number;
  minQuantity?: number;
  unit?: string;
  sku?: string;
  purchasePrice?: number;
  sellingPrice?: number;
  expiryDate?: Date;
  batchNumber?: string;
  supplier?: string;
  active?: boolean;
}

export interface IInventoryRepository {
  findItems(filters: InventoryItemFilters): Promise<InventoryItem[]>;

  getStats(clinicId: string, now: Date): Promise<InventoryStats>;

  findItemById(
    id: string,
    clinicId: string,
  ): Promise<InventoryItemWithMovements | null>;

  findItemByClinic(id: string, clinicId: string): Promise<InventoryItem | null>;

  createItem(data: CreateInventoryItemData): Promise<InventoryItem>;

  updateItem(
    id: string,
    data: UpdateInventoryItemData,
    clinicId: string,
  ): Promise<InventoryItem>;

  addMovementAndUpdateQuantity(
    itemId: string,
    clinicId: string,
    movementData: CreateInventoryMovementData,
    quantityDelta: number,
  ): Promise<InventoryMovement>;
}

export const INVENTORY_REPOSITORY_TOKEN = Symbol('IInventoryRepository');
