import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { InventoryController } from './presentation/controllers/inventory.controller';
import { InventoryService } from './application/services/inventory.service';
import { InventoryCommandService } from './application/services/inventory-command.service';
import { InventoryQueryService } from './application/services/inventory-query.service';
import { INVENTORY_REPOSITORY_TOKEN } from './core/repositories/inventory.repository.interface';
import { PrismaInventoryRepository } from './infrastructure/repositories/prisma-inventory.repository';

@Module({
  imports: [PrismaModule],
  controllers: [InventoryController],
  providers: [
    InventoryCommandService,
    InventoryQueryService,
    InventoryService,
    {
      provide: INVENTORY_REPOSITORY_TOKEN,
      useClass: PrismaInventoryRepository,
    },
  ],
  exports: [InventoryService],
})
export class InventoryModule {}
