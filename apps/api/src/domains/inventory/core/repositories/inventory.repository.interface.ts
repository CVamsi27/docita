import { InventoryItem, InventoryMovement, Prisma } from '@workspace/db';

export type InventoryItemWithMovements = InventoryItem & {
  movements: InventoryMovement[];
};

export interface IInventoryRepository {
  findItems(where: Prisma.InventoryItemWhereInput): Promise<InventoryItem[]>;

  findItemById(
    id: string,
    clinicId: string,
  ): Promise<InventoryItemWithMovements | null>;

  findItemByClinic(id: string, clinicId: string): Promise<InventoryItem | null>;

  createItem(data: Prisma.InventoryItemCreateInput): Promise<InventoryItem>;

  updateItem(
    id: string,
    data: Prisma.InventoryItemUpdateInput,
  ): Promise<InventoryItem>;

  addMovementAndUpdateQuantity(
    itemId: string,
    movementData: Prisma.InventoryMovementCreateInput,
    quantityDelta: number,
  ): Promise<InventoryMovement>;
}

export const INVENTORY_REPOSITORY_TOKEN = Symbol('IInventoryRepository');
