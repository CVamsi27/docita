import { Controller, Get, Post, Body, UseGuards, Logger } from '@nestjs/common';
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
import { RolesGuard } from '@/shared/modules/auth/auth/roles.guard';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { VerifyBackupRequestDto } from '@/common/dto/database-operations.dto';

@ApiTags('Database Operations')
@ApiBearerAuth()
@Controller('api/v1/operations/database')
@UseGuards(RolesGuard)
@Roles('SUPER_ADMIN')
export class DatabaseOperationsController {
  private readonly logger = new Logger(DatabaseOperationsController.name);

  constructor(
    private backupService: DatabaseBackupService,
    private slowQueryService: SlowQueryLoggingService,
    private indexService: DatabaseIndexOptimizationService,
    private poolingService: DatabasePoolingService,
  ) {
    this.poolingService.logPoolConfig();
  }

  @Post('backup/full')
  @ApiOperation({ summary: 'Create full database backup' })
  @ApiResponse({ status: 200, description: 'Backup created successfully' })
  async createFullBackup() {
    const result = await this.backupService.createFullBackup();
    this.logger.log(`Full backup created: ${result.filepath}`);
    return result;
  }

  @Post('backup/schema')
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
  @ApiOperation({ summary: 'Get database connection pool configuration' })
  @ApiResponse({ status: 200, description: 'Pool configuration' })
  getPoolConfig() {
    const config = this.poolingService.getOptimalPoolConfig();
    return {
      config,
    };
  }

  @Get('status')
  @ApiOperation({ summary: 'Get overall database operations status' })
  @ApiResponse({ status: 200, description: 'Database status' })
  getStatus() {
    const slowQueries = this.slowQueryService.getSlowQueryStats();
    const poolConfig = this.poolingService.getOptimalPoolConfig();

    return {
      backups: {
        available: this.backupService.getAvailableBackups().length,
        lastBackup: this.backupService.getAvailableBackups()[0]?.created,
      },
      slowQueries,
      poolConfig: {
        min: poolConfig.min,
        max: poolConfig.max,
      },
      status: 'operational',
    };
  }
}
