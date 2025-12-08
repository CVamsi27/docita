import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';

export interface AuditLogData {
  clinicId: string;
  userId: string;
  actionType: string;
  resourceType: string;
  resourceId: string;
  changes?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
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

  /**
   * Log an action to audit trail
   * Uses Bull queue for async processing to avoid blocking API responses
   */
  async logAction(
    data: AuditLogData,
    immediate: boolean = false,
  ): Promise<void> {
    try {
      if (immediate) {
        // Direct logging (used for critical actions)
        await this.createAuditLog(data);
      } else {
        // Queue for async processing
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
        `Failed to queue audit log: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Create audit log entry in database (Phase 2: Using AuditLog table)
   */
  async createAuditLog(data: AuditLogData): Promise<any> {
    try {
      // Verify clinic and user exist
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

      // Create audit log entry in AuditLog table (Phase 2)
      const auditLog = await this.prisma.auditLog.create({
        data: {
          clinicId: data.clinicId,
          userId: data.userId,
          action: data.actionType,
          entityType: data.resourceType,
          entityId: data.resourceId,
          newValue: data.changes as any,
        },
      });

      this.logger.log(
        `[AUDIT] ${data.actionType} | User: ${data.userId} | Resource: ${data.resourceType}:${data.resourceId} | ID: ${auditLog.id}`,
      );

      // Return audit log entry
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

      // Log to monitoring for immediate visibility
      this.logger.debug(`Audit log: ${JSON.stringify(auditData)}`);

      return auditData;
    } catch (error) {
      this.logger.error(
        `Failed to create audit log: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get audit logs with filtering (Phase 2: Query AuditLog table)
   * Only accessible to SUPER_ADMIN and clinic ADMIN
   */
  async getAuditLogs(filter: AuditLogFilter, userRole: string): Promise<any[]> {
    try {
      // Access control: only SUPER_ADMIN and ADMIN can view
      if (userRole !== 'SUPER_ADMIN' && userRole !== 'ADMIN') {
        throw new BadRequestException(
          'Insufficient permissions to view audit logs',
        );
      }

      // Build where clause for AuditLog table
      const where: any = {};

      if (filter.clinicId) {
        where.clinicId = filter.clinicId;
      }

      if (filter.userId) {
        where.userId = filter.userId;
      }

      if (filter.actionType) {
        where.action = filter.actionType; // Mapped to 'action' field in AuditLog table
      }

      if (filter.resourceType) {
        where.entityType = filter.resourceType; // Mapped to 'entityType' field
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

      // Query audit logs from AuditLog table (Phase 2)
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
        `Failed to get audit logs: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Archive old audit logs (quarterly job)
   * Moves logs older than 90 days to archive table
   */
  archiveOldLogs(daysOld: number = 90): void {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      this.logger.log(
        `Archiving audit logs older than ${cutoffDate.toISOString()} (${daysOld} days)`,
      );

      // Archive logic will be implemented after Phase 2 migration
      // For now, just log the operation
      this.logger.log(
        `Archive operation scheduled for logs before ${cutoffDate.toISOString()}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to archive audit logs: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Log sensitive user action
   */
  async logUserAction(
    userId: string,
    clinicId: string,
    actionType: 'PROFILE_UPDATE' | 'ROLE_CHANGE' | 'PASSWORD_CHANGE',
    changes: Record<string, any>,
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

  /**
   * Log prescription action
   */
  async logPrescriptionAction(
    userId: string,
    clinicId: string,
    actionType:
      | 'PRESCRIPTION_CREATE'
      | 'PRESCRIPTION_UPDATE'
      | 'PRESCRIPTION_APPROVE'
      | 'PRESCRIPTION_DELETE',
    prescriptionId: string,
    changes?: Record<string, any>,
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

  /**
   * Log payment action
   */
  async logPaymentAction(
    userId: string,
    clinicId: string,
    actionType: 'PAYMENT_RETRY' | 'PAYMENT_REFUND' | 'PAYMENT_FAILED',
    invoiceId: string,
    changes?: Record<string, any>,
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

  /**
   * Log appointment action
   */
  async logAppointmentAction(
    userId: string,
    clinicId: string,
    actionType: 'APPOINTMENT_CANCEL' | 'APPOINTMENT_NO_SHOW',
    appointmentId: string,
    changes?: Record<string, any>,
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

  /**
   * Log admin action
   */
  async logAdminAction(
    userId: string,
    clinicId: string,
    actionType:
      | 'ADMIN_CREATE'
      | 'ADMIN_UPDATE'
      | 'ADMIN_DELETE'
      | 'ADMIN_ROLE_CHANGE',
    adminId: string,
    changes?: Record<string, any>,
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

  /**
   * Log data export
   */
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
}
