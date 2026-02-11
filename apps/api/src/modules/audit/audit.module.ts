import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { AuditEventListener } from './audit-event.listener';
import { AuditProcessor } from './audit.processor';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({
      name: 'audit',
      defaultJobOptions: {
        removeOnComplete: true,
        attempts: 3,
      },
    }),
  ],
  controllers: [AuditController],
  providers: [AuditService, AuditEventListener, AuditProcessor],
  exports: [AuditService],
})
export class AuditModule {}
