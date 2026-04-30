import prisma from "./prisma-script-client";

async function analyzeIndexes() {
  const unusedIndexes = await prisma.$queryRaw`
    SELECT
      schemaname || '.' || relname AS table,
      indexrelname AS index,
      pg_size_pretty(pg_relation_size(i.indexrelid)) AS index_size,
      idx_scan as scan_count
    FROM pg_stat_user_indexes i
    JOIN pg_index using (indexrelid)
    WHERE idx_scan = 0
    AND indisunique IS FALSE
    ORDER BY pg_relation_size(i.indexrelid) DESC;
  `;
  console.table(unusedIndexes);

  const cacheHitRatio = await prisma.$queryRaw`
    SELECT
      sum(heap_blks_read) as heap_read,
      sum(heap_blks_hit)  as heap_hit,
      ROUND(sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read))::numeric, 4) as ratio
    FROM pg_statio_user_tables;
  `;
  console.table(cacheHitRatio);

  const seqScans = await prisma.$queryRaw`
    SELECT
      relname AS table,
      seq_scan,
      idx_scan,
      seq_scan - idx_scan AS difference
    FROM pg_stat_user_tables
    WHERE seq_scan > idx_scan
    AND seq_scan > 50
    ORDER BY difference DESC
    LIMIT 10;
  `;
  console.table(seqScans);
}

analyzeIndexes()
  .catch((error: unknown) => {
    const message =
      error instanceof Error ? error.message : "Unknown index analysis error";
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
