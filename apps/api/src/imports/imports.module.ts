import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ImportsController } from './imports.controller';
import { BulkImportController } from './bulk-import.controller';
import { ImportsService } from './imports.service';
import { BulkImportService } from './bulk-import.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AIModule } from '../modules/ai/ai.module';

@Module({
  imports: [
    PrismaModule,
    AIModule,
    BullModule.registerQueue({
      name: 'bulk-import',
      defaultJobOptions: {
        removeOnComplete: true,
        attempts: 1,
      },
    }),
  ],
  controllers: [ImportsController, BulkImportController],
  providers: [ImportsService, BulkImportService],
  exports: [BulkImportService],
})
export class ImportsModule {}
