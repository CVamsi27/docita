// jscpd:ignore-start
import { isRecord } from '@workspace/utils';

function readErrorMessageFields(error: unknown): {
  code: string;
  message: string;
} {
  if (!isRecord(error)) {
    return { code: '', message: '' };
  }
  const code = typeof error['code'] === 'string' ? error['code'] : '';
  const message =
    typeof error['message'] === 'string' ? error['message'].toLowerCase() : '';
  return { code, message };
}

export function isDatabaseAuthError(error: unknown): boolean {
  const { code, message } = readErrorMessageFields(error);

  if (code === 'P1000') return true;

  return (
    message.includes('authentication failed against the database server') ||
    message.includes('database credentials') ||
    message.includes('password authentication failed')
  );
}

export function isDatabaseConnectivityError(error: unknown): boolean {
// jscpd:ignore-end
  const { message } = readErrorMessageFields(error);

  return (
    message.includes('self-signed certificate in certificate chain') ||
    message.includes('error opening a tls connection') ||
    message.includes('connection refused') ||
    message.includes('timed out') ||
    message.includes('database unavailable') ||
    message.includes('server closed the connection unexpectedly')
  );
}
