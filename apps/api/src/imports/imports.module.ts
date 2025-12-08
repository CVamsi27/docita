import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ImportsController } from './imports.controller';
import { BulkImportController } from './bulk-import.controller';
import { ImportsService } from './imports.service';
import { BulkImportService } from './bulk-import.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
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
