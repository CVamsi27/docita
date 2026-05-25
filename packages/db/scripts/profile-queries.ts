import prisma from "./prisma-script-client";

type QueryRow = {
  query: string;
  calls: bigint;
  total_time_ms: number;
  mean_time_ms: number;
  rows: bigint;
};

function writeSection(title: string): void {
  process.stdout.write(`\n=== ${title} ===\n`);
}

function writeRows(rows: unknown[]): void {
  if (!rows.length) {
    process.stdout.write("No rows returned.\n");
    return;
  }

  process.stdout.write(
    `${JSON.stringify(
      rows,
      (_key, value) => (typeof value === "bigint" ? value.toString() : value),
      2,
    )}\n`,
  );
}

async function ensurePgStatStatements(): Promise<boolean> {
  try {
    await prisma.$executeRawUnsafe(
      `CREATE EXTENSION IF NOT EXISTS pg_stat_statements`,
    );
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(
      [
        "pg_stat_statements is not available on this database.",
        `  Underlying error: ${message}`,
        "  To enable locally, ensure shared_preload_libraries=pg_stat_statements",
        "  is set on Postgres and a role with CREATE permission on the database",
        "  is used. docker-compose.yml already configures the local container.",
        "",
      ].join("\n"),
    );
    return false;
  }
}

async function run(): Promise<void> {
  try {
    writeSection("Top Slow Queries (pg_stat_statements)");
    const hasPgss = await ensurePgStatStatements();
    if (!hasPgss) {
      writeRows([]);
      writeSection("Top Seq Scan Tables");
      const seqScanTables = await prisma.$queryRaw<
        Array<{ table: string; seq_scan: bigint; idx_scan: bigint; scan_ratio: number }>
      >`
        SELECT
          relname AS table,
          seq_scan,
          idx_scan,
          ROUND((seq_scan::numeric / NULLIF((seq_scan + idx_scan), 0)), 4) AS scan_ratio
        FROM pg_stat_user_tables
        WHERE (seq_scan + idx_scan) > 0
        ORDER BY scan_ratio DESC, seq_scan DESC
        LIMIT 20
      `;
      writeRows(seqScanTables);
      return;
    }

    const slowQueries = await prisma.$queryRaw<QueryRow[]>`
      SELECT
        query,
        calls,
        ROUND(total_exec_time::numeric, 2) AS total_time_ms,
        ROUND(mean_exec_time::numeric, 2) AS mean_time_ms,
        rows
      FROM pg_stat_statements
      ORDER BY mean_exec_time DESC
      LIMIT 20
    `;
    writeRows(slowQueries);

    writeSection("Top Seq Scan Tables");
    const seqScanTables = await prisma.$queryRaw<
      Array<{ table: string; seq_scan: bigint; idx_scan: bigint; scan_ratio: number }>
    >`
      SELECT
        relname AS table,
        seq_scan,
        idx_scan,
        ROUND((seq_scan::numeric / NULLIF((seq_scan + idx_scan), 0)), 4) AS scan_ratio
      FROM pg_stat_user_tables
      WHERE (seq_scan + idx_scan) > 0
      ORDER BY scan_ratio DESC, seq_scan DESC
      LIMIT 20
    `;
    writeRows(seqScanTables);
  } finally {
    await prisma.$disconnect();
  }
}

run().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : "Unknown query profiling error";
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
