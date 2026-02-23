/**
 * Audit Module
 *
 * Provides comprehensive audit logging for compliance and security.
 * Logs all sensitive operations with user context and audit trail.
 *
 * Usage:
 * 1. Import AuditModule in your feature module
 * 2. Inject IAuditLogger into your service
 * 3. Call logger.log() for important operations
 *
 * Example:
 * @Injectable()
 * export class UserService {
 *   constructor(
 *     @Inject('auditLogger') private audit: IAuditLogger,
 *   ) {}
 *
 *   async updateUser(userId: string, updates: UpdateUserDto) {
 *     const before = await this.getUser(userId);
 *     const after = await this.saveUser(userId, updates);
 *
 *     await this.audit.log({
 *       userId: currentUserId,
 *       clinicId,
 *       action: AuditAction.USER_UPDATED,
 *       resourceType: 'User',
 *       resourceId: userId,
 *       changes: {
 *         name: { before: before.name, after: after.name },
 *         email: { before: before.email, after: after.email },
 *       },
 *       status: 'success',
 *     });
 *   }
 * }
 */

import { Module } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
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
