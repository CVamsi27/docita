import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { AuditEventListener } from './audit-event.listener';
import { AuditProcessor } from './audit.processor';
import { PrismaModule } from '@/prisma/prisma.module';
import { MockBullModule } from '@/common/mocks/mock-bull.module';

const BullModule = MockBullModule;

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
