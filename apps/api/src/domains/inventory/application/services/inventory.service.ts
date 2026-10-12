import { Injectable } from '@nestjs/common';
import { InventoryCommandService } from './inventory-command.service';
import { InventoryQueryService } from './inventory-query.service';

/**
 * Facade — delegates inventory reads and mutations to query/command services.
 */
@Injectable()
export class InventoryService {
  constructor(
    private readonly queryService: InventoryQueryService,
    private readonly commandService: InventoryCommandService,
  ) {}

  getItems(
    clinicId: string,
    filters: Parameters<InventoryQueryService['getItems']>[1],
  ) {
    return this.queryService.getItems(clinicId, filters);
  }

  getStats(clinicId: string) {
    return this.queryService.getStats(clinicId);
  }

  getItemById(clinicId: string, id: string) {
    return this.queryService.getItemById(clinicId, id);
  }

  createItem(
    clinicId: string,
    userId: string,
    data: Parameters<InventoryCommandService['createItem']>[2],
  ) {
    return this.commandService.createItem(clinicId, userId, data);
  }

  updateItem(
    clinicId: string,
    id: string,
    userId: string,
    data: Parameters<InventoryCommandService['updateItem']>[3],
  ) {
    return this.commandService.updateItem(clinicId, id, userId, data);
  }

  deleteItem(clinicId: string, id: string) {
    return this.commandService.deleteItem(clinicId, id);
  }

  addMovement(
    clinicId: string,
    itemId: string,
    userId: string,
    data: Parameters<InventoryCommandService['addMovement']>[3],
  ) {
    return this.commandService.addMovement(clinicId, itemId, userId, data);
  }
}
