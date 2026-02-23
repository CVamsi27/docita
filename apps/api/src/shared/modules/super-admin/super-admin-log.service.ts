import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AppointmentStatus, ErrorSeverity, InvoiceStatus } from '@workspace/db';
import type { SystemLogEntry } from '@workspace/types';

@Injectable()
export class SuperAdminLogService {
  private readonly logger = new Logger(SuperAdminLogService.name);

  constructor(private prisma: PrismaService) {}

  async getLogs(limit: number = 50, offset: number = 0) {
    try {
      const [auditLogs, auditTotal, errorLogs, errorTotal] = await Promise.all([
        this.prisma.auditLog.findMany({
          take: limit,
          skip: offset,
          orderBy: { createdAt: 'desc' },
          include: {
            clinic: {
              select: { name: true },
            },
          },
        }),
        this.prisma.auditLog.count(),
        this.prisma.errorLog.findMany({
          take: limit,
          skip: offset,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            createdAt: true,
            severity: true,
            type: true,
            message: true,
            path: true,
            statusCode: true,
            clinicId: true,
          },
        }),
        this.prisma.errorLog.count(),
      ]);

      // Transform audit logs to the expected format
      const auditEntries: SystemLogEntry[] = auditLogs.map((log) => ({
        id: log.id,
        timestamp: log.createdAt.toISOString(),
        level: this.getLogLevel(log.action),
        module: log.entityType,
        message: `${log.action} on ${log.entityType}`,
        details: log.clinic?.name ? `Clinic: ${log.clinic.name}` : undefined,
      }));

      const errorEntries: SystemLogEntry[] = errorLogs.map((log) => ({
        id: `error-${log.id}`,
        timestamp: log.createdAt.toISOString(),
        level: this.getErrorSeverityLevel(log.severity),
        module: 'Frontend/Monitoring',
        message: `${log.type}: ${log.message}`,
        details: [
          log.path ? `Path: ${log.path}` : null,
          log.statusCode ? `Status: ${log.statusCode}` : null,
          log.clinicId ? `Clinic ID: ${log.clinicId}` : null,
        ]
          .filter(Boolean)
          .join(' • '),
      }));

      const logs = [...auditEntries, ...errorEntries]
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        )
        .slice(0, limit);

      const total = auditTotal + errorTotal;

      if (logs.length > 0) {
        return {
          data: logs,
          total,
        };
      }

      // Fallback: Generate logs from recent database activity if no audit logs exist
      return this.getRecentActivityLogs(limit, offset);
    } catch (error) {
      this.logger.error('Failed to fetch logs', error);
      throw new InternalServerErrorException('Failed to fetch logs');
    }
  }

  private getLogLevel(action: string): 'INFO' | 'WARNING' | 'ERROR' {
    if (action === 'DELETE') return 'WARNING';
    if (action === 'ERROR' || action.includes('FAIL')) return 'ERROR';
    return 'INFO';
  }

  private getErrorSeverityLevel(
    severity: ErrorSeverity,
  ): 'INFO' | 'WARNING' | 'ERROR' {
    if (
      severity === ErrorSeverity.CRITICAL ||
      severity === ErrorSeverity.ERROR
    ) {
      return 'ERROR';
    }

    if (severity === ErrorSeverity.WARNING) {
      return 'WARNING';
    }

    return 'INFO';
  }

  private async getRecentActivityLogs(limit: number, offset: number) {
    const [appointments, patients, invoices] = await Promise.all([
      this.prisma.appointment.findMany({
        take: Math.ceil(limit / 3),
        skip: Math.floor(offset / 3),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          createdAt: true,
          status: true,
          clinic: { select: { name: true } },
        },
      }),
      this.prisma.patient.findMany({
        take: Math.ceil(limit / 3),
        skip: Math.floor(offset / 3),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          createdAt: true,
          firstName: true,
          lastName: true,
          clinic: { select: { name: true } },
        },
      }),
      this.prisma.invoice.findMany({
        take: Math.ceil(limit / 3),
        skip: Math.floor(offset / 3),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          createdAt: true,
          status: true,
          total: true,
        },
      }),
    ]);

    const logs: SystemLogEntry[] = [];

    appointments.forEach((apt) => {
      logs.push({
        id: `apt-${apt.id}`,
        timestamp: apt.createdAt.toISOString(),
        level: apt.status === AppointmentStatus.CANCELLED ? 'WARNING' : 'INFO',
        module: 'Appointments',
        message: `Appointment ${apt.status}`,
        details: apt.clinic?.name,
      });
    });

    patients.forEach((patient) => {
      logs.push({
        id: `patient-${patient.id}`,
        timestamp: patient.createdAt.toISOString(),
        level: 'INFO',
        module: 'Patients',
        message: `Patient registered: ${patient.firstName} ${patient.lastName}`,
        details: patient.clinic?.name,
      });
    });

    invoices.forEach((inv) => {
      logs.push({
        id: `inv-${inv.id}`,
        timestamp: inv.createdAt.toISOString(),
        level: inv.status === InvoiceStatus.CANCELLED ? 'WARNING' : 'INFO',
        module: 'Billing',
        message: `Invoice ${inv.status}: ₹${inv.total}`,
      });
    });

    logs.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    return {
      data: logs.slice(0, limit),
      total: logs.length,
    };
  }
}
