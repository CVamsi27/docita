/**
 * Audit Logger Service
 *
 * Logs audit trail using Prisma for persistence.
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { IAuditLogger, AuditLogEntry, AuditAction } from './audit.interface';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuditLoggerService implements IAuditLogger {
  constructor(private prisma: PrismaService) {}

  async log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
    try {
      await (this.prisma as any).auditLog.create({
        data: {
          id: uuidv4(),
          timestamp: new Date(),
          userId: entry.userId,
          clinicId: entry.clinicId,
          action: entry.action,
          resourceType: entry.resourceType,
          resourceId: entry.resourceId,
          changes: entry.changes ? JSON.stringify(entry.changes) : null,
          metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          status: entry.status,
          failureReason: entry.failureReason,
        },
      });
    } catch (error) {
      // Don't throw - audit failures should not break main flow
      console.error('Failed to log audit entry:', error);
    }
  }

  async getLogsForResource(
    resourceType: string,
    resourceId: string,
  ): Promise<AuditLogEntry[]> {
    const logs = await (this.prisma as any).auditLog.findMany({
      where: {
        resourceType,
        resourceId,
      },
      orderBy: { timestamp: 'desc' },
    });

    return this.parseAuditLogs(logs);
  }

  async getLogsForUser(
    userId: string,
    clinicId: string,
  ): Promise<AuditLogEntry[]> {
    const logs = await (this.prisma as any).auditLog.findMany({
      where: {
        userId,
        clinicId,
      },
      orderBy: { timestamp: 'desc' },
      take: 1000, // Limit to prevent huge result sets
    });

    return this.parseAuditLogs(logs);
  }

  async getLogsForClinic(clinicId: string): Promise<AuditLogEntry[]> {
    const logs = await (this.prisma as any).auditLog.findMany({
      where: { clinicId },
      orderBy: { timestamp: 'desc' },
      take: 10000, // Large limit for clinic-wide audit
    });

    return this.parseAuditLogs(logs);
  }

  async getLogsForAction(
    action: AuditAction,
    clinicId: string,
  ): Promise<AuditLogEntry[]> {
    const logs = await (this.prisma as any).auditLog.findMany({
      where: {
        action,
        clinicId,
      },
      orderBy: { timestamp: 'desc' },
      take: 1000,
    });

    return this.parseAuditLogs(logs);
  }

  async deleteOldLogs(olderThanDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await (this.prisma as any).auditLog.deleteMany({
      where: {
        timestamp: {
          lt: cutoffDate,
        },
      },
    });

    return result.count;
  }

  private parseAuditLogs(logs: any[]): AuditLogEntry[] {
    return logs.map((log) => ({
      ...log,
      changes: log.changes ? JSON.parse(log.changes) : undefined,
      metadata: log.metadata ? JSON.parse(log.metadata) : undefined,
    }));
  }
}
