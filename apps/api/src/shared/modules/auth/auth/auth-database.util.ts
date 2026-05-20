export function isDatabaseAuthError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as { code?: unknown; message?: unknown };
  const code = typeof candidate.code === 'string' ? candidate.code : '';
  const message =
    typeof candidate.message === 'string'
      ? candidate.message.toLowerCase()
      : '';

  if (code === 'P1000') {
    return true;
  }

  return (
    message.includes('authentication failed against the database server') ||
    message.includes('database credentials') ||
    message.includes('password authentication failed')
  );
}

export function isDatabaseConnectivityError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as { message?: unknown };
  const message =
    typeof candidate.message === 'string'
      ? candidate.message.toLowerCase()
      : '';

  return (
    message.includes('self-signed certificate in certificate chain') ||
    message.includes('error opening a tls connection') ||
    message.includes('connection refused') ||
    message.includes('timed out') ||
    message.includes('database unavailable') ||
    message.includes('server closed the connection unexpectedly')
  );
}
