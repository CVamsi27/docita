import { AppointmentStatus, ErrorSeverity, InvoiceStatus } from '@workspace/db';
import type { SystemLogEntry } from '@workspace/types';
import { isRecord } from '@workspace/utils';
import type { InternalLogFilters } from './internal-log.types';

function mapAuditActionToLogLevel(
  action: string,
): 'INFO' | 'WARNING' | 'ERROR' {
  if (action === 'DELETE') return 'WARNING';
  if (action === 'ERROR' || action.includes('FAIL')) return 'ERROR';
  return 'INFO';
}

function mapErrorSeverityToLogLevel(
  severity: ErrorSeverity,
): 'INFO' | 'WARNING' | 'ERROR' | 'DEBUG' {
  if (severity === ErrorSeverity.CRITICAL || severity === ErrorSeverity.ERROR)
    return 'ERROR';

  if (severity === ErrorSeverity.WARNING) return 'WARNING';

  if (severity === ErrorSeverity.DEBUG) return 'DEBUG';

  return 'INFO';
}

function formatErrorSource(metadata: unknown): string | null {
  if (!isRecord(metadata)) {
    return null;
  }

  const source = metadata['source'];
  return typeof source === 'string' ? `Source: ${source}` : null;
}

function resolveErrorModule(
  type: string,
  method: string | null,
  metadata: unknown,
): string {
  if (type.startsWith('Observability:')) return 'API/Observability';
  if (method === 'CLIENT') return 'Frontend/Client';

  if (isRecord(metadata)) {
    const source = metadata['source'];
    if (source === 'frontend') return 'Frontend/Monitoring';
    if (typeof source === 'string') return source;
  }

  return 'System/Monitoring';
}

export function mapAuditLogRow(log: {
  id: string;
  createdAt: Date;
  action: string;
  entityType: string;
  clinic: { name: string } | null;
}): SystemLogEntry {
  return {
    id: log.id,
    timestamp: log.createdAt.toISOString(),
    level: mapAuditActionToLogLevel(log.action),
    module: log.entityType,
    message: `${log.action} on ${log.entityType}`,
    details: log.clinic?.name ? `Clinic: ${log.clinic.name}` : undefined,
  };
}

export function mapErrorLogRow(log: {
  id: string;
  createdAt: Date;
  severity: ErrorSeverity;
  type: string;
  message: string;
  path: string | null;
  method: string | null;
  statusCode: number | null;
  clinicId: string | null;
  metadata: unknown;
}): SystemLogEntry {
  return {
    id: `error-${log.id}`,
    timestamp: log.createdAt.toISOString(),
    level: mapErrorSeverityToLogLevel(log.severity),
    module: resolveErrorModule(log.type, log.method, log.metadata),
    message: `${log.type}: ${log.message}`,
    details: [
      formatErrorSource(log.metadata),
      log.path ? `Path: ${log.path}` : null,
      log.statusCode ? `Status: ${log.statusCode}` : null,
      log.clinicId ? `Clinic ID: ${log.clinicId}` : null,
    ]
      .filter(Boolean)
      .join(' • '),
  };
}

export function mapAppointmentActivityRow(apt: {
  id: string;
  createdAt: Date;
  status: AppointmentStatus;
  clinic: { name: string } | null;
}): SystemLogEntry {
  return {
    id: `apt-${apt.id}`,
    timestamp: apt.createdAt.toISOString(),
    level: apt.status === AppointmentStatus.CANCELLED ? 'WARNING' : 'INFO',
    module: 'Appointments',
    message: `Appointment ${apt.status}`,
    details: apt.clinic?.name,
  };
}

export function mapPatientActivityRow(patient: {
  id: string;
  createdAt: Date;
  clinic: { name: string } | null;
}): SystemLogEntry {
  return {
    id: `patient-${patient.id}`,
    timestamp: patient.createdAt.toISOString(),
    level: 'INFO',
    module: 'Patients',
    message: 'Patient registered',
    details: patient.clinic?.name,
  };
}

export function mapInvoiceActivityRow(inv: {
  id: string;
  createdAt: Date;
  status: InvoiceStatus;
  total: { toString(): string };
}): SystemLogEntry {
  return {
    id: `inv-${inv.id}`,
    timestamp: inv.createdAt.toISOString(),
    level: inv.status === InvoiceStatus.CANCELLED ? 'WARNING' : 'INFO',
    module: 'Billing',
    message: `Invoice ${inv.status}: ${inv.total.toString()}`,
  };
}

export function applyInMemoryFallbackFilters(
  logs: SystemLogEntry[],
  filters: InternalLogFilters,
): SystemLogEntry[] {
  const level = filters.level;
  const module = filters.module?.trim().toLowerCase();
  const search = filters.q?.trim().toLowerCase();

  return logs.filter((log) => {
    if (level && log.level !== level) return false;

    if (module && !log.module.toLowerCase().includes(module)) {
      return false;
    }

    if (search) {
      const messageMatch = log.message.toLowerCase().includes(search);
      const detailsMatch = (log.details ?? '').toLowerCase().includes(search);
      if (!messageMatch && !detailsMatch) return false;
    }

    return true;
  });
}
