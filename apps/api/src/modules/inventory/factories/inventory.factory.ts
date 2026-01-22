import { Injectable } from '@nestjs/common';
import {
  InventoryItemInput,
  InventoryItemSchema,
  InventoryMovementInput,
  InventoryMovementSchema,
} from '../schemas/inventory.schema';

@Injectable()
export class InventoryFactory {
  createItem(data: InventoryItemInput) {
    return InventoryItemSchema.parse(data);
  }

  createMovement(data: InventoryMovementInput) {
    return InventoryMovementSchema.parse(data);
  }
}
