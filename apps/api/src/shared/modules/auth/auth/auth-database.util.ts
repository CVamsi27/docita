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

export function isDatabaseConnectivityError(error: unknown): boolean {
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
