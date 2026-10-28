/** The SQL fixtures may create/drop their own schema only on a dedicated local DB. */
export function requireMetricsTestDatabaseTarget(
  value: string | undefined,
): string {
  if (!value) {
    throw new Error(
      'Set DOCITA_METRICS_TEST_DATABASE_URL to a dedicated local capacity database.',
    );
  }
  let target: URL;
  try {
    target = new URL(value);
  } catch {
    throw new Error('Metrics fixture database URL is invalid.');
  }
  const loopback = new Set(['localhost', '127.0.0.1', '[::1]']);
  let database: string;
  try {
    database = decodeURIComponent(target.pathname.slice(1));
  } catch {
    throw new Error('Metrics fixture database name is invalid.');
  }
  if (
    !['postgres:', 'postgresql:'].includes(target.protocol) ||
    !loopback.has(target.hostname) ||
    !/^docita_capacity_[a-z0-9_]+$/.test(database) ||
    target.search ||
    target.hash
  ) {
    throw new Error(
      'Metrics fixtures require a loopback docita_capacity_* database without URL options.',
    );
  }
  return target.toString();
}
