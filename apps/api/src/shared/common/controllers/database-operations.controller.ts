import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Logger,
  Inject,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { DatabaseBackupService } from '@/shared/modules/database/database-backup.service';
import { SlowQueryLoggingService } from '@/shared/modules/database/slow-query-logging.service';
import { DatabaseIndexOptimizationService } from '@/shared/modules/database/database-index-optimization.service';
import { DatabasePoolingService } from '@/shared/modules/database/database-pooling.service';
import { PoolSaturationHistoryService } from '@/shared/modules/database/pool-saturation-history.service';
import { PrismaService } from '@/prisma/prisma.service';
import { RolesGuard } from '@/shared/modules/auth/auth/roles.guard';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { Role } from '@workspace/db';
import { VerifyBackupRequestDto } from '@/shared/common/dto/database-operations.dto';
import { getTenantScopeDiagnostics } from '@/shared/common/extensions/tenant-scope-policy';
import { tenantScopeDiagnosticsSchema } from '@workspace/types';

@ApiTags('Database Operations')
@ApiBearerAuth()
@Controller('operations/database')
@UseGuards(RolesGuard)
@Roles(Role.INTERNAL)
export class DatabaseOperationsController {
  private readonly logger = new Logger(DatabaseOperationsController.name);

  constructor(
    private backupService: DatabaseBackupService,
    private slowQueryService: SlowQueryLoggingService,
    private indexService: DatabaseIndexOptimizationService,
    private poolingService: DatabasePoolingService,
    private poolHistory: PoolSaturationHistoryService,
    private prisma: PrismaService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {
    this.poolingService.logPoolConfig();
  }

  /**
   * Live saturation of the pool the API actually connects through.
   *
   * `/pooling/config` returns `DatabasePoolingService`'s computed suggestion,
   * which disagrees with the real pool whenever `cpuCount * 5 + 10` differs from
   * `DATABASE_CONSTANTS.POOL_MAX_*` (e.g. cpuCount 2 suggests 20 where the
   * client is capped at 15). This endpoint reports the real counters instead.
   */
  @Get('pooling/saturation')
  @ApiOperation({
    summary: 'Get live database connection pool saturation',
  })
  @ApiResponse({
    status: 200,
    description:
      'Live pool counters: max, total, idle, waiting, and how long callers have been queued',
  })
  getPoolSaturation() {
    return this.prisma.getPoolSaturation();
  }

  /**
   * Time-series of pool saturation for this replica. Capacity limits come from
   * the shape of this window — whether the queue ever drains — not from a single
   * reading, so it is exposed next to the live counters above.
   */
  @Get('pooling/saturation/history')
  @ApiOperation({
    summary: 'Get the pool saturation history window for this replica',
  })
  @ApiResponse({
    status: 200,
    description:
      'Bounded window of pool saturation samples with peaks and the longest saturation run',
  })
  getPoolSaturationHistory() {
    return this.poolHistory.getHistory();
  }

  @Post('pooling/saturation/history/clear')
  // Declared below `@Post` on purpose: `check-api-conformance` scans downward
  // from the `@Post` line for `@HttpCode`, so placing it above would make this
  // route a new allowlist entry instead of a conforming one.
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear the pool saturation history window' })
  @ApiResponse({
    status: 200,
    description: 'Pool saturation history cleared',
  })
  clearPoolSaturationHistory() {
    this.poolHistory.clearHistory();
    return { success: true, message: 'Pool saturation history cleared' };
  }

  @Post('backup/full')
  // `@HttpCode` is declared below `@Post` for every action POST in this
  // controller: `check-api-conformance` scans downward from the `@Post` line,
  // so a decorator above it is invisible to the check.
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create full database backup' })
  @ApiResponse({ status: 200, description: 'Backup created successfully' })
  async createFullBackup() {
    const result = await this.backupService.createFullBackup();
    this.logger.log(`Full backup created: ${result.filepath}`);
    return result;
  }

  @Post('backup/schema')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create schema-only backup' })
  @ApiResponse({
    status: 200,
    description: 'Schema backup created successfully',
  })
  async createSchemaBackup() {
    const result = await this.backupService.createSchemaBackup();
    this.logger.log(`Schema backup created: ${result.filepath}`);
    return result;
  }

  @Get('backups/list')
  @ApiOperation({ summary: 'List available backups' })
  @ApiResponse({ status: 200, description: 'List of available backups' })
  listBackups() {
    return this.backupService.getAvailableBackups();
  }

  @Post('backups/cleanup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clean up old backups based on retention policy' })
  @ApiResponse({ status: 200, description: 'Old backups cleaned up' })
  cleanupOldBackups() {
    const result = this.backupService.cleanupOldBackups();
    this.logger.log(
      `Backup cleanup complete: ${result.deleted} deleted, ${result.freedSpace} freed`,
    );
    return result;
  }

  @Post('backup/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify backup integrity' })
  @ApiResponse({ status: 200, description: 'Backup verification result' })
  async verifyBackup(@Body() dto: VerifyBackupRequestDto) {
    return await this.backupService.verifyBackup(dto.filepath);
  }

  @Get('slow-queries')
  @ApiOperation({ summary: 'Get slow query statistics' })
  @ApiResponse({ status: 200, description: 'Slow query statistics' })
  getSlowQueryStats() {
    return this.slowQueryService.getSlowQueryStats();
  }

  @Post('slow-queries/clear')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear slow query history' })
  @ApiResponse({ status: 200, description: 'Slow query history cleared' })
  clearSlowQueryHistory() {
    this.slowQueryService.clearHistory();
    return { success: true, message: 'Slow query history cleared' };
  }

  @Get('indexes/analysis')
  @ApiOperation({ summary: 'Analyze all database indexes' })
  @ApiResponse({ status: 200, description: 'Index analysis results' })
  async analyzeIndexes() {
    const indexes = await this.indexService.analyzeAllIndexes();
    const unused = await this.indexService.findUnusedIndexes();
    const missing = await this.indexService.findMissingIndexes();
    const bloat = await this.indexService.getIndexBloat();

    await this.indexService.logIndexReport();

    return {
      totalIndexes: indexes.length,
      usedIndexes: indexes.filter((i) => i.isUsed).length,
      unusedIndexes: unused,
      missingIndexRecommendations: missing,
      indexesWithBloat: bloat,
      summary: {
        unusedCount: unused.length,
        missingCount: missing.length,
        bloatCount: bloat.length,
      },
    };
  }

  @Get('pooling/config')
  @ApiOperation({
    summary: 'Get the advisory database connection pool sizing suggestion',
  })
  @ApiResponse({
    status: 200,
    description:
      'Computed pool sizing suggestion. Advisory only — read /pooling/saturation for the pool actually in use.',
  })
  getPoolConfig() {
    return {
      authoritative: false,
      appliesToRunningClient: false,
      // These numbers are a computed suggestion, not the running pool.
      // `PrismaService` builds its pool from `DATABASE_CONSTANTS`
      // (`POOL_MAX_PRODUCTION` / `POOL_MAX_DEVELOPMENT`), so this diverges from
      // production on any host whose `cpuCount * 5 + 10` differs from those
      // constants. Reporting it without that context caused the misreading this
      // endpoint is kept separate from `/status` for.
      liveEndpoint: '/operations/database/pooling/saturation',
      config: this.poolingService.getOptimalPoolConfig(),
    };
  }

  @Get('tenant-scope')
  @ApiOperation({ summary: 'Get tenant isolation scope coverage diagnostics' })
  @ApiResponse({
    status: 200,
    description: 'Tenant scope coverage diagnostics',
  })
  getTenantScopeCoverage() {
    return tenantScopeDiagnosticsSchema.parse(
      getTenantScopeDiagnostics(this.clock.now()),
    );
  }

  @Get('status')
  @ApiOperation({ summary: 'Get overall database operations status' })
  @ApiResponse({ status: 200, description: 'Database status' })
  getStatus() {
    const slowQueries = this.slowQueryService.getSlowQueryStats();
    const saturation = this.prisma.getPoolSaturation();

    return {
      backups: {
        available: this.backupService.getAvailableBackups().length,
        lastBackup: this.backupService.getAvailableBackups()[0]?.created,
      },
      slowQueries,
      // Live counters from the pool the client really uses, not the computed
      // suggestion in `poolConfig`.
      poolSaturation: saturation,
      status: saturation.saturated ? 'degraded' : 'operational',
    };
  }
}
