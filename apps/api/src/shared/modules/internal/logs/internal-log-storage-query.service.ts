import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  buildAuditWhere,
  buildErrorWhere,
} from './internal-log-filter.builder';
import { mapAuditLogRow, mapErrorLogRow } from './internal-log-mapping.helpers';
import type {
  InternalLogFilters,
  InternalLogQueryResult,
} from './internal-log.types';

@Injectable()
export class InternalLogStorageQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async queryStoredLogs(
    limit: number,
    offset: number,
    filters: InternalLogFilters,
  ): Promise<InternalLogQueryResult> {
    const fetchSize = limit + offset;
    const auditWhere = buildAuditWhere(filters);
    const errorWhere = buildErrorWhere(filters);

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

    const logs = [
      ...auditLogs.map(mapAuditLogRow),
      ...errorLogs.map(mapErrorLogRow),
    ]
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )
      .slice(offset, offset + limit);

    return {
      data: logs,
      total: auditTotal + errorTotal,
    };
  }
}
