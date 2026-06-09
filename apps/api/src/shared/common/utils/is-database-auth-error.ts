// jscpd:ignore-start
import { isRecord } from '@workspace/utils';

export function isDatabaseAuthError(error: unknown): boolean {
  if (!isRecord(error)) {
    return false;
  }

  const code = typeof error.code === 'string' ? error.code : '';
  const message =
    typeof error.message === 'string' ? error.message.toLowerCase() : '';

  if (code === 'P1000') return true;

  return (
    message.includes('authentication failed against the database server') ||
    message.includes('database credentials') ||
    message.includes('password authentication failed')
  );
}
