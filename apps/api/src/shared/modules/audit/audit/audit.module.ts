import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditController, AuditSummaryController } from './audit.controller';
import { AuditEventListener } from './audit-event.listener';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuthGuardsModule } from '@/shared/modules/auth/auth/auth-guards.module';

@Module({
  imports: [PrismaModule, AuthGuardsModule],
  controllers: [AuditController, AuditSummaryController],
  providers: [AuditService, AuditEventListener],
  exports: [AuditService],
})
export class AuditModule {}
