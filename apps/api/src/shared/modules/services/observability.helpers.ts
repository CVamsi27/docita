import { ErrorSeverity } from '@workspace/db';

export interface MetricEntry {
  name: string;
  value: number | number[];
  labels?: Record<string, string>;
  timestamp: number;
}

export interface StructuredLogOptions {
  captureInSentry?: boolean;
}

export function toSentryContextValue(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return Object.fromEntries(Object.entries(value));
  }

  return { value };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function getRecordStatus(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const status = value.status;
  return typeof status === 'string' ? status : undefined;
}

export function getRecordString(
  value: Record<string, unknown> | undefined,
  key: string,
): string | undefined {
  const field = value?.[key];
  return typeof field === 'string' ? field : undefined;
}

export function mapLogLevelToErrorSeverity(
  level: 'debug' | 'info' | 'warn' | 'error',
): ErrorSeverity {
  switch (level) {
    case 'debug':
      return ErrorSeverity.DEBUG;
    case 'warn':
      return ErrorSeverity.WARNING;
    case 'error':
      return ErrorSeverity.ERROR;
    default:
      return ErrorSeverity.INFO;
  }
}
