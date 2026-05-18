import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { InventoryController } from './presentation/controllers/inventory.controller';
import { InventoryService } from './application/services/inventory.service';
import { INVENTORY_REPOSITORY_TOKEN } from './core/repositories/inventory.repository.interface';
import { PrismaInventoryRepository } from './infrastructure/repositories/prisma-inventory.repository';

@Module({
  imports: [PrismaModule],
  controllers: [InventoryController],
  providers: [
    InventoryService,
    {
      provide: INVENTORY_REPOSITORY_TOKEN,
      useClass: PrismaInventoryRepository,
    },
  ],
  exports: [InventoryService],
})
export class InventoryModule {}
