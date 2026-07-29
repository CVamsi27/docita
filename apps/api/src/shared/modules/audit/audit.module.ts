import { Module } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditLoggerService } from './audit-logger.service';

@Module({
  providers: [
    {
      provide: 'auditLogger',
      useClass: AuditLoggerService,
    },
    // Also expose the class directly so consumers can inject
    // `AuditLoggerService` without using the legacy string token.
    AuditLoggerService,
    PrismaService,
  ],
  exports: ['auditLogger', AuditLoggerService],
})
export class AuditModule {}
