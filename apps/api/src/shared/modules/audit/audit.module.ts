import { Module } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditLoggerService } from './audit-logger.service';

@Module({
  providers: [
    {
      provide: 'auditLogger',
      useClass: AuditLoggerService,
    },
    PrismaService,
  ],
  exports: ['auditLogger'],
})
export class AuditModule {}
