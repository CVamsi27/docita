import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { IAuditLogger, AuditLogEntry, AuditAction } from './audit.interface';
import { randomUUID } from 'crypto';
import { Prisma } from '@workspace/db';

@Injectable()
export class AuditLoggerService implements IAuditLogger {
  constructor(private prisma: PrismaService) {}

  private toDbStatus(status: AuditLogEntry['status']): string {
    return status === 'failure' ? 'FAILED' : 'SUCCESS';
  }

  private fromDbStatus(status: string): AuditLogEntry['status'] {
    return status === 'FAILED' ? 'failure' : 'success';
  }

  async log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          id: randomUUID(),
          createdAt: new Date(),
          userId: entry.userId,
          clinicId: entry.clinicId,
          action: entry.action,
          entityType: entry.resourceType,
          entityId: entry.resourceId ?? 'UNKNOWN',
          oldValue: entry.changes
            ? (Object.fromEntries(
                Object.entries(entry.changes).map(([key, value]) => [
                  key,
                  value.before,
                ]),
              ) as Prisma.InputJsonValue)
            : undefined,
          newValue: entry.changes
            ? (Object.fromEntries(
                Object.entries(entry.changes).map(([key, value]) => [
                  key,
                  value.after,
                ]),
              ) as Prisma.InputJsonValue)
            : undefined,
          metadata:
            entry.metadata !== undefined
              ? (entry.metadata as Prisma.InputJsonValue)
              : undefined,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          status: this.toDbStatus(entry.status),
          errorMessage: entry.failureReason,
        },
      });
    } catch (error) {}
  }

  async getLogsForResource(
    resourceType: string,
    resourceId: string,
  ): Promise<AuditLogEntry[]> {
    const logs = await this.prisma.auditLog.findMany({
      where: {
        entityType: resourceType,
        entityId: resourceId,
      },
      orderBy: { createdAt: 'desc' },
    });

    return this.parseAuditLogs(logs);
  }

  async getLogsForUser(
    userId: string,
    clinicId: string,
  ): Promise<AuditLogEntry[]> {
    const logs = await this.prisma.auditLog.findMany({
      where: {
        userId,
        clinicId,
      },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });

    return this.parseAuditLogs(logs);
  }

  async getLogsForClinic(clinicId: string): Promise<AuditLogEntry[]> {
    const logs = await this.prisma.auditLog.findMany({
      where: { clinicId },
      orderBy: { createdAt: 'desc' },
      take: 10000,
    });

    return this.parseAuditLogs(logs);
  }

  async getLogsForAction(
    action: AuditAction,
    clinicId: string,
  ): Promise<AuditLogEntry[]> {
    const logs = await this.prisma.auditLog.findMany({
      where: {
        action,
        clinicId,
      },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });

    return this.parseAuditLogs(logs);
  }

  async deleteOldLogs(olderThanDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.prisma.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    return result.count;
  }

  private toRecord(value: unknown): Record<string, unknown> | undefined {
    if (!value || typeof value !== 'object') {
      return undefined;
    }

    return Object.fromEntries(Object.entries(value));
  }

  private parseAuditLogs(
    logs: Array<Prisma.AuditLogGetPayload<Record<string, never>>>,
  ): AuditLogEntry[] {
    return logs.map((log) => ({
      id: log.id,
      timestamp: log.createdAt,
      userId: log.userId,
      clinicId: log.clinicId,
      action: log.action as AuditAction,
      resourceType: log.entityType,
      resourceId: log.entityId,
      changes:
        log.oldValue !== null || log.newValue !== null
          ? {
              __record: {
                before: log.oldValue,
                after: log.newValue,
              },
            }
          : undefined,
      metadata:
        log.metadata && typeof log.metadata === 'object'
          ? this.toRecord(log.metadata)
          : undefined,
      ipAddress: log.ipAddress ?? undefined,
      userAgent: log.userAgent ?? undefined,
      status: this.fromDbStatus(log.status),
      failureReason: log.errorMessage ?? undefined,
    }));
  }
}
