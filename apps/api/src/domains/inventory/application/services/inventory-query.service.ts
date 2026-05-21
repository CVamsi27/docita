import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import {
  IInventoryRepository,
  INVENTORY_REPOSITORY_TOKEN,
  type InventoryItemFilters,
} from '@/domains/inventory/core/repositories/inventory.repository.interface';

@Injectable()
export class InventoryQueryService {
  constructor(
    @Inject(INVENTORY_REPOSITORY_TOKEN)
    private readonly inventoryRepository: IInventoryRepository,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async getItems(
    clinicId: string,
    filters: Omit<InventoryItemFilters, 'clinicId'>,
  ) {
    return this.inventoryRepository.findItems({ clinicId, ...filters });
  }

  async getStats(clinicId: string) {
    return this.inventoryRepository.getStats(clinicId, this.clock.now());
  }

  async getItemById(clinicId: string, id: string) {
    const item = await this.inventoryRepository.findItemById(id, clinicId);
    if (!item) throw new NotFoundException('Inventory item not found');
    return item;
  }
}
