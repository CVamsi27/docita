import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditController, AuditSummaryController } from './audit.controller';
import { AuditEventListener } from './audit-event.listener';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AuditController, AuditSummaryController],
  providers: [AuditService, AuditEventListener],
  exports: [AuditService],
})
export class AuditModule {}
