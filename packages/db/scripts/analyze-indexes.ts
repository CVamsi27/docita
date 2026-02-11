import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function analyzeIndexes() {
  console.log("Starting Database Index Analysis...");

  try {
    // 1. Unused Indexes
    console.log("\n--- Unused Indexes (Scanned = 0) ---");
    console.log(
      "NOTE: New indexes will have 0 scans. Check index usage over time.",
    );
    // Cast to any to bypass type checking for raw query result if needed, but Prisma types should work.
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

    // 2. Cache Hit Ratio
    console.log("\n--- Cache Hit Ratios ---");
    const cacheHitRatio = await prisma.$queryRaw`
      SELECT
        sum(heap_blks_read) as heap_read,
        sum(heap_blks_hit)  as heap_hit,
        ROUND(sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read))::numeric, 4) as ratio
      FROM pg_statio_user_tables;
    `;
    console.table(cacheHitRatio);

    // 3. Index Usage vs Sequential Scans
    console.log("\n--- Tables with more Seq Scans than Index Scans ---");
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
  } catch (error) {
    console.error("Error analyzing indexes:", error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeIndexes();
