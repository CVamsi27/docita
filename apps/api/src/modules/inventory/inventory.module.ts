import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { InventoryFactory } from './factories/inventory.factory';

@Module({
  imports: [PrismaModule],
  controllers: [InventoryController],
  providers: [InventoryService, InventoryFactory],
  exports: [InventoryService, InventoryFactory],
})
export class InventoryModule {}
