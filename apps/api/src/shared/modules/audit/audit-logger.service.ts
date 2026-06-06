import { Inject, Injectable, Logger } from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { PrismaService } from '@/prisma/prisma.service';
import {
  IAuditLogger,
  AuditLogEntry,
  AuditAction,
  AuditTransactionClient,
} from './audit.interface';
import { randomUUID } from 'crypto';
import { Prisma } from '@workspace/db';
import { toPrismaInputJsonValue } from '@/shared/common/json/to-prisma-input-json-value';
import { parseStringEnumMember } from '@workspace/utils';

const AUDIT_ACTION_MEMBERS = Object.values(AuditAction);

// Field names whose values must be redacted before audit storage to keep
// raw PHI / PII out of the JSONB payload. The list errs toward redaction:
// adding a field here cannot regress compliance, only obscure a noisy log.
const REDACT_FIELDS = new Set<string>([
  'password',
  'passwordHash',
  'newPassword',
  'currentPassword',
  'secret',
  'apiKey',
  'token',
  'refreshToken',
  'accessToken',
  'authorization',
  'ssn',
  'aadhaar',
  'aadhaarNumber',
  'pan',
  'panNumber',
  'cardNumber',
  'cvv',
  'phoneNumber',
  'phone',
  'mobile',
  'email',
  'dob',
  'dateOfBirth',
  'addressLine',
  'addressLine1',
  'addressLine2',
  'medicalNotes',
  'diagnosis',
  'symptoms',
  'medications',
  'prescription',
  'notes',
]);

function redactValue(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value;
  if (depth > 6) return '[depth-limited]';
  if (Array.isArray(value)) return value.map((v) => redactValue(v, depth + 1));
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = REDACT_FIELDS.has(k) ? '[REDACTED]' : redactValue(v, depth + 1);
    }
    return out;
  }
  return value;
}

@Injectable()
export class AuditLoggerService implements IAuditLogger {
  private readonly logger = new Logger(AuditLoggerService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  private toDbStatus(status: AuditLogEntry['status']): string {
    return status === 'failure' ? 'FAILED' : 'SUCCESS';
  }

  private fromDbStatus(status: string): AuditLogEntry['status'] {
    return status === 'FAILED' ? 'failure' : 'success';
  }

  async log(
    entry: Omit<AuditLogEntry, 'id' | 'timestamp'>,
    tx?: AuditTransactionClient,
  ): Promise<void> {
    const client = tx ?? this.prisma;
    try {
      await client.auditLog.create({
        data: {
          id: randomUUID(),
          createdAt: this.clock.now(),
          userId: entry.userId,
          clinicId: entry.clinicId,
          action: entry.action,
          entityType: entry.resourceType,
          entityId: entry.resourceId ?? 'UNKNOWN',
          oldValue: entry.changes
            ? toPrismaInputJsonValue(
                redactValue(
                  Object.fromEntries(
                    Object.entries(entry.changes).map(([key, value]) => [
                      key,
                      value.before,
                    ]),
                  ),
                ),
              )
            : undefined,
          newValue: entry.changes
            ? toPrismaInputJsonValue(
                redactValue(
                  Object.fromEntries(
                    Object.entries(entry.changes).map(([key, value]) => [
                      key,
                      value.after,
                    ]),
                  ),
                ),
              )
            : undefined,
          metadata:
            entry.metadata !== undefined
              ? toPrismaInputJsonValue(redactValue(entry.metadata))
              : undefined,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          status: this.toDbStatus(entry.status),
          errorMessage: entry.failureReason,
        },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown audit log failure';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to write audit log for ${entry.action} ${entry.resourceType}: ${message}`,
        stack,
      );
      throw error;
    }
  }

  /**
   * Fire-and-forget log. Errors are caught and logged at warn — the caller
   * is never blocked. Use for read audits, login attempts, periodic
   * snapshots, and other entries where audit-row loss is preferable to
   * blocking the request path on the audit insert.
   */
  logAsync(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): void {
    void this.log(entry).catch((error) => {
      const message =
        error instanceof Error ? error.message : 'Unknown audit log failure';
      this.logger.warn(
        `Async audit log failed for ${entry.action} ${entry.resourceType}: ${message}`,
      );
    });
  }

  // Hard cap to keep audit reads from loading thousands of rows into memory.
  // Callers that need older history should switch to AuditService.getAuditLogs
  // which supports skip/take filters.
  private static readonly MAX_PAGE_SIZE = 200;

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
      take: AuditLoggerService.MAX_PAGE_SIZE,
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
      take: AuditLoggerService.MAX_PAGE_SIZE,
    });

    return this.parseAuditLogs(logs);
  }

  async getLogsForClinic(clinicId: string): Promise<AuditLogEntry[]> {
    const logs = await this.prisma.auditLog.findMany({
      where: { clinicId },
      orderBy: { createdAt: 'desc' },
      take: AuditLoggerService.MAX_PAGE_SIZE,
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
      take: AuditLoggerService.MAX_PAGE_SIZE,
    });

    return this.parseAuditLogs(logs);
  }

  async deleteOldLogs(olderThanDays: number): Promise<number> {
    const cutoffDate = this.clock.now();
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
    if (!value || typeof value !== 'object') return undefined;

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
      action:
        parseStringEnumMember(AUDIT_ACTION_MEMBERS, log.action) ??
        AuditAction.PATIENT_UPDATED,
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
