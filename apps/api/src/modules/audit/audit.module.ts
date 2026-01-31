import { Module } from '@nestjs/common';
// import { BullModule } from '@nestjs/bull';
import { MockBullModule as BullModule } from '../../common/mocks/mock-bull.module';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { AuditEventListener } from './audit-event.listener';
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
  providers: [AuditService, AuditEventListener],
  exports: [AuditService],
})
export class AuditModule {}
