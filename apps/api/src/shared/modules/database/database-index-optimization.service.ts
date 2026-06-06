import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma } from '@workspace/db';

export interface IndexAnalysis {
  tableName: string;
  indexName: string;
  columnNames: string[];
  isUnique: boolean;
  indexSize: string;
  scanCount: number;
  tupleRead: number;
  tupleWritten: number;
  isUsed: boolean;
  recommendation?: string;
}

export interface MissingIndexRecommendation {
  tableName: string;
  columnNames: string[];
  reason: string;
  estimatedImprovementPercent: number;
}

@Injectable()
export class DatabaseIndexOptimizationService {
  private readonly logger = new Logger(DatabaseIndexOptimizationService.name);

  constructor(private prisma: PrismaService) {}

  async analyzeAllIndexes(): Promise<IndexAnalysis[]> {
    try {
      const result = await this.prisma.$queryRaw<
        Array<{
          tablename: string;
          indexname: string;
          is_primary: boolean;
          is_unique: boolean;
          index_type: string;
          index_size: string;
          scan_count: number;
          tuple_read: number;
          tuple_fetched: number;
        }>
      >(Prisma.sql`
        SELECT
          t.tablename,
          i.indexname,
          ix.indisprimary AS is_primary,
          ix.indisunique AS is_unique,
          a.amname AS index_type,
          pg_size_pretty(pg_relation_size(i.indexrelid)) AS index_size,
          idx_scan AS scan_count,
          idx_tup_read AS tuple_read,
          idx_tup_fetch AS tuple_fetched
        FROM pg_indexes idx
        JOIN pg_class t ON t.relname = idx.tablename
        JOIN pg_class i ON i.relname = idx.indexname
        JOIN pg_index ix ON ix.indexrelid = i.oid
        JOIN pg_am a ON a.oid = i.relam
        JOIN pg_stat_user_indexes s ON s.indexrelname = idx.indexname
        WHERE idx.schemaname NOT IN ('pg_catalog', 'information_schema')
        ORDER BY idx_scan DESC
      `);
      return result.map((row) => ({
        tableName: row.tablename,
        indexName: row.indexname,
        columnNames: this.parseIndexColumns(row.indexname),
        isUnique: row.is_unique,
        indexSize: row.index_size,
        scanCount: row.scan_count || 0,
        tupleRead: row.tuple_read || 0,
        tupleWritten: row.tuple_fetched || 0,
        isUsed: (row.scan_count || 0) > 0,
        recommendation: this.getIndexRecommendation(
          row.scan_count,
          row.index_size,
        ),
      }));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to analyze indexes: ${errorMsg}`);
      return [];
    }
  }

  async findUnusedIndexes(): Promise<IndexAnalysis[]> {
    const allIndexes = await this.analyzeAllIndexes();
    return allIndexes.filter(
      (idx) =>
        !idx.isUsed &&
        !idx.indexName.includes('_pkey') &&
        idx.indexName !== 'pg_class_oid_index',
    );
  }

  async findMissingIndexes(): Promise<MissingIndexRecommendation[]> {
    try {
      const result = await this.prisma.$queryRaw<
        Array<{
          schemaname: string;
          tablename: string;
          attname: string;
          n_distinct: number;
          correlation: number;
        }>
      >(Prisma.sql`
        SELECT
          schemaname,
          tablename,
          attname,
          n_distinct,
          correlation
        FROM pg_stats
        WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
          AND n_distinct > 100
          AND correlation < 0.1
        ORDER BY n_distinct DESC
        LIMIT 20
      `);
      return result.map((row) => ({
        tableName: row.tablename,
        columnNames: [row.attname],
        reason: `High cardinality column (${row.n_distinct} distinct values) with low correlation`,
        estimatedImprovementPercent: Math.min(
          50,
          Math.abs(row.correlation) * 100,
        ),
      }));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to find missing indexes: ${errorMsg}`);
      return [];
    }
  }

  async getIndexBloat(): Promise<
    Array<{ tableName: string; indexName: string; bloatPercent: number }>
  > {
    try {
      const result = await this.prisma.$queryRaw<
        Array<{
          tablename: string;
          indexname: string;
          bloat_percent: string;
        }>
      >(Prisma.sql`
        SELECT
          t.relname AS tablename,
          i.relname AS indexname,
          ROUND(100.0 * (pg_relation_size(i.oid) - pg_relation_size(i.oid, 'main')) 
            / pg_relation_size(i.oid))::numeric, 2) AS bloat_percent
        FROM pg_class t
        JOIN pg_index idx ON t.oid = idx.indrelid
        JOIN pg_class i ON i.oid = idx.indexrelid
        WHERE t.relkind = 'r'
          AND pg_relation_size(i.oid) > 1024 * 1024
        ORDER BY bloat_percent DESC
      `);
      return result.map((row) => ({
        tableName: row.tablename,
        indexName: row.indexname,
        bloatPercent: parseFloat(row.bloat_percent) || 0,
      }));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get index bloat: ${errorMsg}`);
      return [];
    }
  }

  private getIndexRecommendation(
    scanCount: number,
    indexSize: string,
  ): string | undefined {
    const sizeInMB = this.parseSizeToMB(indexSize);

    if (scanCount === 0 && sizeInMB > 10)
      return 'Consider dropping this unused index to save storage';

    if (scanCount < 10 && sizeInMB > 50)
      return 'Rarely used large index - consider dropping';

    if (scanCount > 10000)
      return 'High-use index - ensure it is well-maintained';

    return undefined;
  }

  private parseSizeToMB(sizeStr: string): number {
    if (sizeStr.includes('MB')) return parseFloat(sizeStr) * 1;
    if (sizeStr.includes('GB')) return parseFloat(sizeStr) * 1024;
    if (sizeStr.includes('KB')) return parseFloat(sizeStr) / 1024;
    return 0;
  }

  private parseIndexColumns(indexName: string): string[] {
    const parts = indexName.split('_');
    if (parts.length > 2)
      return parts.slice(2).map((p) => p.replace(/(_idx|_index)$/, ''));
    return [indexName];
  }

  async logIndexReport(): Promise<void> {
    const indexes = await this.analyzeAllIndexes();
    const unused = indexes.filter((idx) => !idx.isUsed);
    const bloat = await this.getIndexBloat();
    const missing = await this.findMissingIndexes();

    this.logger.log('=== DATABASE INDEX ANALYSIS REPORT ===');
    this.logger.log(`Total Indexes: ${indexes.length}`);
    this.logger.log(
      `Used Indexes: ${indexes.filter((idx) => idx.isUsed).length}`,
    );
    this.logger.log(`Unused Indexes: ${unused.length}`);
    this.logger.log(`Indexes with Bloat: ${bloat.length}`);
    this.logger.log(`Missing Index Recommendations: ${missing.length}`);

    if (unused.length > 0) {
      this.logger.log(`\nUnused Indexes (candidates for deletion):`);
      unused.slice(0, 5).forEach((idx) => {
        this.logger.log(
          `  - ${idx.tableName}.${idx.indexName} (${idx.indexSize})`,
        );
      });
    }

    if (missing.length > 0) {
      this.logger.log(`\nMissing Index Recommendations:`);
      missing.slice(0, 5).forEach((rec) => {
        this.logger.log(
          `  - ${rec.tableName}(${rec.columnNames.join(', ')}) - ${rec.reason}`,
        );
      });
    }

    if (bloat.length > 0) {
      this.logger.log(`\nIndexes with Significant Bloat:`);
      bloat.slice(0, 5).forEach((b) => {
        this.logger.log(
          `  - ${b.tableName}.${b.indexName}: ${b.bloatPercent}% bloat`,
        );
      });
    }
  }
}
