import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { Prisma } from '@workspace/db';
import {
  IInventoryRepository,
  INVENTORY_REPOSITORY_TOKEN,
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

    const now = this.clock.now();
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
}
