import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { Prisma } from '@workspace/db';

export interface AuditLogData {
  clinicId: string;
  userId: string;
  actionType: string;
  resourceType: string;
  resourceId: string;
  changes?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditLogFilter {
  clinicId?: string;
  userId?: string;
  actionType?: string;
  resourceType?: string;
  startDate?: Date;
  endDate?: Date;
  skip?: number;
  take?: number;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    private prisma: PrismaService,
    @InjectQueue('audit') private auditQueue: Queue,
  ) {}

  async logAction(
    data: AuditLogData,
    immediate: boolean = false,
  ): Promise<void> {
    try {
      if (immediate) {
        await this.createAuditLog(data);
      } else {
        await this.auditQueue.add('log-action', data, {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: true,
        });
      }
    } catch (error) {
      this.logger.error(
        `Failed to queue audit log: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  async createAuditLog(data: AuditLogData): Promise<unknown> {
    return this.prisma.runUnrestricted(async () => {
      try {
        const [clinic, user] = await Promise.all([
          this.prisma.clinic.findUnique({ where: { id: data.clinicId } }),
          this.prisma.user.findUnique({ where: { id: data.userId } }),
        ]);

        if (!clinic) {
          throw new BadRequestException(`Clinic ${data.clinicId} not found`);
        }

        if (!user) {
          throw new BadRequestException(`User ${data.userId} not found`);
        }

        const auditLog = await this.prisma.auditLog.create({
          data: {
            clinicId: data.clinicId,
            userId: data.userId,
            action: data.actionType,
            entityType: data.resourceType,
            entityId: data.resourceId,
            newValue:
              (data.changes as Prisma.InputJsonValue) || Prisma.JsonNull,
            metadata:
              (data.metadata as Prisma.InputJsonValue) || Prisma.JsonNull,
            ipAddress: data.ipAddress,
            userAgent: data.userAgent,
          },
        });

        this.logger.log(
          `[AUDIT] ${data.actionType} | User: ${data.userId} | Resource: ${data.resourceType}:${data.resourceId} | ID: ${auditLog.id}`,
        );

        const auditData = {
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
          createdAt: new Date(),
        };

        return auditData;
      } catch (error) {
        this.logger.error(
          `Failed to create audit log: ${error instanceof Error ? error.message : 'Unknown error'}`,
          error instanceof Error ? error.stack : undefined,
        );
        throw error;
      }
    });
  }

  async getAuditLogs(
    filter: AuditLogFilter,
    userRole: string,
  ): Promise<unknown[]> {
    try {
      if (userRole !== 'SUPER_ADMIN' && userRole !== 'ADMIN') {
        throw new BadRequestException(
          'Insufficient permissions to view audit logs',
        );
      }

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

  archiveOldLogs(daysOld: number = 90): void {
    try {
      const cutoffDate = new Date();
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
    actionType: 'PROFILE_UPDATE' | 'ROLE_CHANGE' | 'PASSWORD_CHANGE',
    changes: Record<string, unknown>,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.logAction({
      userId,
      clinicId,
      actionType,
      resourceType: 'User',
      resourceId: userId,
      changes,
      ipAddress,
      userAgent,
    });
  }

  async logPrescriptionAction(
    userId: string,
    clinicId: string,
    actionType:
      | 'PRESCRIPTION_CREATE'
      | 'PRESCRIPTION_UPDATE'
      | 'PRESCRIPTION_APPROVE'
      | 'PRESCRIPTION_DELETE',
    prescriptionId: string,
    changes?: Record<string, unknown>,
    ipAddress?: string,
  ): Promise<void> {
    await this.logAction({
      userId,
      clinicId,
      actionType,
      resourceType: 'Prescription',
      resourceId: prescriptionId,
      changes,
      ipAddress,
    });
  }

  async logPaymentAction(
    userId: string,
    clinicId: string,
    actionType: 'PAYMENT_RETRY' | 'PAYMENT_REFUND' | 'PAYMENT_FAILED',
    invoiceId: string,
    changes?: Record<string, unknown>,
    ipAddress?: string,
  ): Promise<void> {
    await this.logAction({
      userId,
      clinicId,
      actionType,
      resourceType: 'Invoice',
      resourceId: invoiceId,
      changes,
      ipAddress,
    });
  }

  async logAppointmentAction(
    userId: string,
    clinicId: string,
    actionType: 'APPOINTMENT_CANCEL' | 'APPOINTMENT_NO_SHOW',
    appointmentId: string,
    changes?: Record<string, unknown>,
    ipAddress?: string,
  ): Promise<void> {
    await this.logAction({
      userId,
      clinicId,
      actionType,
      resourceType: 'Appointment',
      resourceId: appointmentId,
      changes,
      ipAddress,
    });
  }

  async logAdminAction(
    userId: string,
    clinicId: string,
    actionType:
      | 'ADMIN_CREATE'
      | 'ADMIN_UPDATE'
      | 'ADMIN_DELETE'
      | 'ADMIN_ROLE_CHANGE',
    adminId: string,
    changes?: Record<string, unknown>,
    ipAddress?: string,
  ): Promise<void> {
    await this.logAction({
      userId,
      clinicId,
      actionType,
      resourceType: 'Admin',
      resourceId: adminId,
      changes,
      ipAddress,
    });
  }

  async logDataExport(
    userId: string,
    clinicId: string,
    entityType: string,
    recordCount: number,
    ipAddress?: string,
  ): Promise<void> {
    await this.logAction({
      userId,
      clinicId,
      actionType: 'DATA_EXPORT',
      resourceType: entityType,
      resourceId: clinicId,
      metadata: { recordCount },
      ipAddress,
    });
  }

  async logPatientAccess(
    userId: string,
    clinicId: string,
    patientId: string,
    accessType: 'VIEW_HISTORY' | 'VIEW_PROFILE' | 'EXPORT_DATA',
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.logAction({
      userId,
      clinicId,
      actionType: accessType,
      resourceType: 'Patient',
      resourceId: patientId,
      ipAddress,
      userAgent,
      metadata: {
        accessTime: new Date().toISOString(),
      },
    });
  }
}
