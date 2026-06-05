export type ManagedDatabaseProvider =
  | 'AWS RDS'
  | 'Supabase'
  | 'Neon'
  | 'PlanetScale'
  | 'Google Cloud SQL'
  | 'Azure Database'
  | 'Azure PostgreSQL'
  | 'CockroachDB Cloud'
  | 'Railway'
  | 'Render';

export function detectManagedDatabaseProvider(
  databaseUrl: string,
): ManagedDatabaseProvider | null {
  if (process.env.RENDER === 'true') return 'Render';

  const url = databaseUrl.toLowerCase();
  const providers: Array<{ pattern: string; name: ManagedDatabaseProvider }> = [
    { pattern: 'rds.amazonaws.com', name: 'AWS RDS' },
    { pattern: 'supabase.co', name: 'Supabase' },
    { pattern: 'neon.tech', name: 'Neon' },
    { pattern: 'psdb.cloud', name: 'PlanetScale' },
    { pattern: 'planetscale.com', name: 'PlanetScale' },
    { pattern: 'cloudsql.googleapis.com', name: 'Google Cloud SQL' },
    { pattern: 'database.azure.com', name: 'Azure Database' },
    { pattern: 'postgres.database.azure.com', name: 'Azure PostgreSQL' },
    { pattern: 'cockroachlabs.cloud', name: 'CockroachDB Cloud' },
    { pattern: 'railway.app', name: 'Railway' },
    { pattern: 'render.com', name: 'Render' },
  ];

  for (const { pattern, name } of providers) {
    if (url.includes(pattern)) return name;
  }

  return null;
}
