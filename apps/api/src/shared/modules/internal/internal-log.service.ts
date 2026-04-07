import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  AppointmentStatus,
  ErrorSeverity,
  InvoiceStatus,
  Prisma,
} from '@workspace/db';
import type { SystemLogEntry } from '@workspace/types';

interface LogFilters {
  level?: SystemLogEntry['level'];
  module?: string;
  q?: string;
}

@Injectable()
export class InternalLogService {
  private readonly logger = new Logger(InternalLogService.name);

  constructor(private prisma: PrismaService) {}

  async getLogs(
    limit: number = 50,
    offset: number = 0,
    filters: LogFilters = {},
  ) {
    try {
      const safeLimit = Number.isFinite(limit)
        ? Math.min(Math.max(limit, 1), 100)
        : 50;
      const safeOffset = Number.isFinite(offset) ? Math.max(offset, 0) : 0;
      const fetchSize = safeLimit + safeOffset;

      const auditWhere = this.buildAuditWhere(filters);
      const errorWhere = this.buildErrorWhere(filters);

      const [auditLogs, auditTotal, errorLogs, errorTotal] = await Promise.all([
        this.prisma.auditLog.findMany({
          take: fetchSize,
          skip: 0,
          where: auditWhere,
          orderBy: { createdAt: 'desc' },
          include: {
            clinic: {
              select: { name: true },
            },
          },
        }),
        this.prisma.auditLog.count({ where: auditWhere }),
        this.prisma.errorLog.findMany({
          take: fetchSize,
          skip: 0,
          where: errorWhere,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            createdAt: true,
            severity: true,
            type: true,
            message: true,
            path: true,
            method: true,
            statusCode: true,
            clinicId: true,
            metadata: true,
          },
        }),
        this.prisma.errorLog.count({ where: errorWhere }),
      ]);

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
        module: this.getErrorModule(log.type, log.method, log.metadata),
        message: `${log.type}: ${log.message}`,
        details: [
          this.getErrorSource(log.metadata),
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
        .slice(safeOffset, safeOffset + safeLimit);

      const total = auditTotal + errorTotal;

      if (logs.length > 0) {
        return {
          data: logs,
          total,
        };
      }

      return this.getRecentActivityLogs(safeLimit, safeOffset, filters);
    } catch (error) {
      this.logger.error('Failed to fetch logs', error);
      throw new InternalServerErrorException('Failed to fetch logs');
    }
  }

  private buildAuditWhere(filters: LogFilters): Prisma.AuditLogWhereInput {
    const conditions: Prisma.AuditLogWhereInput[] = [];

    if (filters.level) {
      if (filters.level === 'WARNING') {
        conditions.push({ action: 'DELETE' });
      } else if (filters.level === 'ERROR') {
        conditions.push({
          OR: [
            { action: 'ERROR' },
            { action: { contains: 'FAIL', mode: 'insensitive' } },
          ],
        });
      } else if (filters.level === 'INFO') {
        conditions.push({
          NOT: [
            { action: 'DELETE' },
            { action: 'ERROR' },
            { action: { contains: 'FAIL', mode: 'insensitive' } },
          ],
        });
      } else if (filters.level === 'DEBUG') {
        conditions.push({ id: '__no_debug_audit_logs__' });
      }
    }

    if (filters.module?.trim()) {
      conditions.push({
        entityType: { contains: filters.module.trim(), mode: 'insensitive' },
      });
    }

    if (filters.q?.trim()) {
      const search = filters.q.trim();
      conditions.push({
        OR: [
          { action: { contains: search, mode: 'insensitive' } },
          { entityType: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    return conditions.length > 0 ? { AND: conditions } : {};
  }

  private buildErrorWhere(filters: LogFilters): Prisma.ErrorLogWhereInput {
    const conditions: Prisma.ErrorLogWhereInput[] = [];

    if (filters.level) {
      if (filters.level === 'ERROR') {
        conditions.push({
          severity: { in: [ErrorSeverity.ERROR, ErrorSeverity.CRITICAL] },
        });
      } else if (filters.level === 'WARNING') {
        conditions.push({ severity: ErrorSeverity.WARNING });
      } else if (filters.level === 'INFO') {
        conditions.push({ severity: ErrorSeverity.INFO });
      } else if (filters.level === 'DEBUG') {
        conditions.push({ severity: ErrorSeverity.DEBUG });
      }
    }

    if (filters.module?.trim()) {
      conditions.push(this.buildErrorModuleWhere(filters.module.trim()));
    }

    if (filters.q?.trim()) {
      const search = filters.q.trim();
      conditions.push({
        OR: [
          { type: { contains: search, mode: 'insensitive' } },
          { message: { contains: search, mode: 'insensitive' } },
          { path: { contains: search, mode: 'insensitive' } },
          { method: { contains: search, mode: 'insensitive' } },
          { clinicId: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    return conditions.length > 0 ? { AND: conditions } : {};
  }

  private buildErrorModuleWhere(module: string): Prisma.ErrorLogWhereInput {
    const normalizedModule = module.toLowerCase();

    if (normalizedModule === 'api/observability') {
      return { type: { startsWith: 'Observability:' } };
    }

    if (normalizedModule === 'frontend/client') {
      return { method: 'CLIENT' };
    }

    if (normalizedModule === 'frontend/monitoring') {
      return {
        metadata: {
          path: ['source'],
          equals: 'frontend',
        },
      };
    }

    if (normalizedModule === 'system/monitoring') {
      return {
        AND: [
          {
            NOT: {
              type: { startsWith: 'Observability:' },
            },
          },
          {
            NOT: {
              method: 'CLIENT',
            },
          },
        ],
      };
    }

    return {
      OR: [
        { type: { contains: module, mode: 'insensitive' } },
        { path: { contains: module, mode: 'insensitive' } },
      ],
    };
  }

  private getLogLevel(action: string): 'INFO' | 'WARNING' | 'ERROR' {
    if (action === 'DELETE') return 'WARNING';
    if (action === 'ERROR' || action.includes('FAIL')) return 'ERROR';
    return 'INFO';
  }

  private getErrorSeverityLevel(
    severity: ErrorSeverity,
  ): 'INFO' | 'WARNING' | 'ERROR' | 'DEBUG' {
    if (
      severity === ErrorSeverity.CRITICAL ||
      severity === ErrorSeverity.ERROR
    ) {
      return 'ERROR';
    }

    if (severity === ErrorSeverity.WARNING) {
      return 'WARNING';
    }

    if (severity === ErrorSeverity.DEBUG) {
      return 'DEBUG';
    }

    return 'INFO';
  }

  private getErrorSource(metadata: unknown): string | null {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      return null;
    }

    const source = (metadata as Record<string, unknown>)['source'];
    return typeof source === 'string' ? `Source: ${source}` : null;
  }

  private getErrorModule(
    type: string,
    method: string | null,
    metadata: unknown,
  ): string {
    if (type.startsWith('Observability:')) return 'API/Observability';
    if (method === 'CLIENT') return 'Frontend/Client';

    if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
      const source = (metadata as Record<string, unknown>)['source'];
      if (source === 'frontend') return 'Frontend/Monitoring';
      if (typeof source === 'string') return source;
    }

    return 'System/Monitoring';
  }

  private async getRecentActivityLogs(
    limit: number,
    offset: number,
    filters: LogFilters,
  ) {
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
        message: `Invoice ${inv.status}: ${inv.total}`,
      });
    });

    logs.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    const filteredLogs = this.applyInMemoryFallbackFilters(logs, filters);

    return {
      data: filteredLogs.slice(offset, offset + limit),
      total: filteredLogs.length,
    };
  }

  private applyInMemoryFallbackFilters(
    logs: SystemLogEntry[],
    filters: LogFilters,
  ) {
    const level = filters.level;
    const module = filters.module?.trim().toLowerCase();
    const search = filters.q?.trim().toLowerCase();

    return logs.filter((log) => {
      if (level && log.level !== level) {
        return false;
      }

      if (module && !log.module.toLowerCase().includes(module)) {
        return false;
      }

      if (search) {
        const messageMatch = log.message.toLowerCase().includes(search);
        const detailsMatch = (log.details || '').toLowerCase().includes(search);
        if (!messageMatch && !detailsMatch) {
          return false;
        }
      }

      return true;
    });
  }
}
