import { ErrorSeverity, Prisma } from '@workspace/db';
import type { InternalLogFilters } from './internal-log.types';

export function buildAuditWhere(
  filters: InternalLogFilters,
): Prisma.AuditLogWhereInput {
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

export function buildErrorWhere(
  filters: InternalLogFilters,
): Prisma.ErrorLogWhereInput {
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
    conditions.push(buildErrorModuleWhere(filters.module.trim()));
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

function buildErrorModuleWhere(module: string): Prisma.ErrorLogWhereInput {
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
