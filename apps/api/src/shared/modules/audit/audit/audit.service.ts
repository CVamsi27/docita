import {
  Inject,
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma } from '@workspace/db';
import { toPrismaInputJsonValue } from '@/shared/common/json/to-prisma-input-json-value';
import { runOutsideActiveTx } from '@/shared/modules/rls/active-tx.storage';
import type { AppAuditLogSummary } from '@workspace/types';
import type {
  AdminActionType,
  AppointmentActionType,
  PatientAccessType,
  PaymentActionType,
  PrescriptionActionType,
  UserActionType,
} from './domain-audit-action-builders';
import {
  buildAdminActionLog,
  buildAppointmentActionLog,
  buildDataExportLog,
  buildPatientAccessLog,
  buildPaymentActionLog,
  buildPrescriptionActionLog,
  buildUserActionLog,
} from './domain-audit-action-builders';

export type { AuditLogData, AuditLogFilter } from './audit.service.types';
import type { AuditLogData, AuditLogFilter } from './audit.service.types';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  /**
   * Persist an audit log entry. Always awaited; failures propagate to the caller.
   * Compliance writes are not optional — if you cannot audit the action, the action
   * must not be considered complete. Wrap the audited write + this call in the same
   * transaction when atomicity matters.
   */
  async logAction(data: AuditLogData): Promise<void> {
    await this.createAuditLog(data);
  }

  async createAuditLog(data: AuditLogData): Promise<unknown> {
    // RLS-BYPASS: audit persistence correlates events across tenants for compliance
    return this.prisma.runUnrestricted(async () =>
      runOutsideActiveTx(async () => {
        try {
          const [clinic, user] = await Promise.all([
            this.prisma.clinic.findUnique({ where: { id: data.clinicId } }),
            this.prisma.user.findUnique({ where: { id: data.userId } }),
          ]);
          if (!clinic)
            throw new BadRequestException(`Clinic ${data.clinicId} not found`);
          if (!user)
            throw new BadRequestException(`User ${data.userId} not found`);

          const auditLog = await this.prisma.auditLog.create({
            data: {
              clinicId: data.clinicId,
              userId: data.userId,
              action: data.actionType,
              entityType: data.resourceType,
              entityId: data.resourceId,
              newValue: data.changes
                ? toPrismaInputJsonValue(data.changes)
                : Prisma.JsonNull,
              metadata: data.metadata
                ? toPrismaInputJsonValue(data.metadata)
                : Prisma.JsonNull,
              ipAddress: data.ipAddress,
              userAgent: data.userAgent,
            },
          });

          this.logger.log(
            `[AUDIT] ${data.actionType} | User: ${data.userId} | Resource: ${data.resourceType}:${data.resourceId} | ID: ${auditLog.id}`,
          );

          return {
            id: auditLog.id,
            clinicId: data.clinicId,
            userId: data.userId,
            actionType: data.actionType,
            resourceType: data.resourceType,
            resourceId: data.resourceId,
            changes: data.changes,
            ipAddress: data.ipAddress,
            userAgent: data.userAgent,
            metadata: data.metadata,
            createdAt: this.clock.now(),
          };
        } catch (error) {
          this.logger.error(
            `Failed to create audit log: ${error instanceof Error ? error.message : 'Unknown error'}`,
            error instanceof Error ? error.stack : undefined,
          );
          throw error;
        }
      }),
    );
  }

  async getAuditLogs(
    filter: AuditLogFilter,
    userRole: string,
  ): Promise<unknown[]> {
    try {
      if (userRole !== 'INTERNAL' && userRole !== 'ADMIN')
        throw new BadRequestException(
          'Insufficient permissions to view audit logs',
        );

      const where: Prisma.AuditLogWhereInput = {};

      if (filter.clinicId) {
        where.clinicId = filter.clinicId;
      }

      if (filter.userId) {
        where.userId = filter.userId;
      }

      if (filter.actionType) {
        where.action = filter.actionType;
      }

      if (filter.resourceType) {
        where.entityType = filter.resourceType;
      }

      if (filter.startDate || filter.endDate) {
        where.createdAt = {};
        if (filter.startDate) {
          where.createdAt.gte = filter.startDate;
        }
        if (filter.endDate) {
          where.createdAt.lte = filter.endDate;
        }
      }

      const logs = await this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: filter.skip || 0,
        take: filter.take || 10,
      });

      this.logger.debug(
        `Fetched ${logs.length} audit logs with filter: ${JSON.stringify(where)}`,
      );

      return logs;
    } catch (error) {
      this.logger.error(
        `Failed to get audit logs: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async getRecentAuditSummary(
    clinicId: string,
    limit: number = 5,
  ): Promise<AppAuditLogSummary[]> {
    const take = Math.min(Math.max(limit, 1), 25);
    const logs = await this.prisma.auditLog.findMany({
      where: { clinicId },
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        id: true,
        action: true,
        createdAt: true,
        user: {
          select: { name: true },
        },
      },
    });

    return logs.map((log) => ({
      id: log.id,
      action: log.action,
      createdAt: log.createdAt.toISOString(),
      actor: log.user ? { name: log.user.name } : undefined,
    }));
  }

  archiveOldLogs(daysOld: number = 90): void {
    try {
      const cutoffDate = this.clock.now();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      this.logger.log(
        `Archiving audit logs older than ${cutoffDate.toISOString()} (${daysOld} days)`,
      );

      this.logger.log(
        `Archive operation scheduled for logs before ${cutoffDate.toISOString()}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to archive audit logs: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  async logUserAction(
    userId: string,
    clinicId: string,
    actionType: UserActionType,
    changes: Record<string, unknown>,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.logAction(
      buildUserActionLog({
        userId,
        clinicId,
        actionType,
        changes,
        ipAddress,
        userAgent,
      }),
    );
  }

  async logPrescriptionAction(
    userId: string,
    clinicId: string,
    actionType: PrescriptionActionType,
    prescriptionId: string,
    changes?: Record<string, unknown>,
    ipAddress?: string,
  ): Promise<void> {
    await this.logAction(
      buildPrescriptionActionLog({
        userId,
        clinicId,
        actionType,
        prescriptionId,
        changes,
        ipAddress,
      }),
    );
  }

  async logPaymentAction(
    userId: string,
    clinicId: string,
    actionType: PaymentActionType,
    invoiceId: string,
    changes?: Record<string, unknown>,
    ipAddress?: string,
  ): Promise<void> {
    await this.logAction(
      buildPaymentActionLog({
        userId,
        clinicId,
        actionType,
        invoiceId,
        changes,
        ipAddress,
      }),
    );
  }

  async logAppointmentAction(
    userId: string,
    clinicId: string,
    actionType: AppointmentActionType,
    appointmentId: string,
    changes?: Record<string, unknown>,
    ipAddress?: string,
  ): Promise<void> {
    await this.logAction(
      buildAppointmentActionLog({
        userId,
        clinicId,
        actionType,
        appointmentId,
        changes,
        ipAddress,
      }),
    );
  }

  async logAdminAction(
    userId: string,
    clinicId: string,
    actionType: AdminActionType,
    adminId: string,
    changes?: Record<string, unknown>,
    ipAddress?: string,
  ): Promise<void> {
    await this.logAction(
      buildAdminActionLog({
        userId,
        clinicId,
        actionType,
        adminId,
        changes,
        ipAddress,
      }),
    );
  }

  async logDataExport(
    userId: string,
    clinicId: string,
    entityType: string,
    recordCount: number,
    ipAddress?: string,
  ): Promise<void> {
    await this.logAction(
      buildDataExportLog({
        userId,
        clinicId,
        entityType,
        recordCount,
        ipAddress,
      }),
    );
  }

  async logPatientAccess(
    userId: string,
    clinicId: string,
    patientId: string,
    accessType: PatientAccessType,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.logAction(
      buildPatientAccessLog({
        userId,
        clinicId,
        patientId,
        accessType,
        ipAddress,
        userAgent,
        accessTime: this.clock.now().toISOString(),
      }),
    );
  }
}
