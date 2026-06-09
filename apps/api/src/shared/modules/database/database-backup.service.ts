import { Inject, Injectable, Logger } from '@nestjs/common';
import { getErrorMessage } from '@workspace/utils';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { Gauge, Histogram, register } from 'prom-client';

@Injectable()
export class DatabaseBackupService {
  private readonly logger = new Logger(DatabaseBackupService.name);
  private backupDir: string;
  private readonly retentionDays: number;
  private readonly databasePassword: string;
  private readonly databaseHost: string;
  private readonly databasePort: string;
  private readonly databaseUser: string;
  private readonly databaseName: string;

  private readonly backupSuccessGauge: Gauge<string>;
  private readonly backupSizeGauge: Gauge<string>;
  private readonly backupDurationHistogram: Histogram<string>;

  constructor(
    private configService: AppConfigService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {
    const dbUrl = new URL(this.configService.getDatabaseUrl());

    // Prefer an explicit BACKUP_DIR env var; fall back to a project-local
    // path so the process doesn't need write access outside its working tree.
    this.backupDir =
      process.env.BACKUP_DIR ??
      path.join(process.cwd(), 'backups', 'postgresql');
    this.retentionDays = 30;

    this.databasePassword = decodeURIComponent(dbUrl.password);
    this.databaseHost = dbUrl.hostname;
    this.databasePort = dbUrl.port || '5434';
    this.databaseUser = decodeURIComponent(dbUrl.username);
    this.databaseName = dbUrl.pathname.replace(/^\//, '');

    this.ensureBackupDirectory();

    const existing = register.getSingleMetric(
      'db_backup_last_success_timestamp',
    );
    this.backupSuccessGauge =
      existing instanceof Gauge
        ? existing
        : new Gauge({
            name: 'db_backup_last_success_timestamp',
            help: 'Unix timestamp of the last successful database backup',
          });

    const sizeExisting = register.getSingleMetric('db_backup_last_size_bytes');
    this.backupSizeGauge =
      sizeExisting instanceof Gauge
        ? sizeExisting
        : new Gauge({
            name: 'db_backup_last_size_bytes',
            help: 'Size in bytes of the last database backup file',
          });

    const histoExisting = register.getSingleMetric(
      'db_backup_duration_seconds',
    );
    this.backupDurationHistogram =
      histoExisting instanceof Histogram
        ? histoExisting
        : new Histogram({
            name: 'db_backup_duration_seconds',
            help: 'Duration of database backup in seconds',
            buckets: [10, 30, 60, 120, 300, 600, 1800, 3600],
          });
  }

  private ensureBackupDirectory(): void {
    try {
      if (!fs.existsSync(this.backupDir)) {
        fs.mkdirSync(this.backupDir, { recursive: true, mode: 0o755 });
        this.logger.log(`Created backup directory: ${this.backupDir}`);
      }
    } catch (err) {
      this.logger.warn(
        `Failed to create configured backup directory ${this.backupDir}: ${getErrorMessage(err)}. Falling back to project-local backups.`,
      );

      const fallback = path.join(process.cwd(), 'backups', 'postgresql');

      try {
        if (!fs.existsSync(fallback)) {
          fs.mkdirSync(fallback, { recursive: true, mode: 0o755 });
        }
        this.backupDir = fallback;
        this.logger.log(`Using fallback backup directory: ${this.backupDir}`);
      } catch (fallbackErr) {
        this.logger.error(
          `Failed to create fallback backup directory: ${getErrorMessage(fallbackErr)}`,
        );
      }
    }
  }

  private sanitizeBackupFilename(filename: string): string {
    const trimmed = filename.trim();
    if (!trimmed) throw new Error('Backup filename cannot be empty');

    const base = path.basename(trimmed);
    if (base !== trimmed)
      throw new Error('Backup filename cannot include path segments');

    if (!/^[a-zA-Z0-9._-]+$/.test(base)) {
      throw new Error('Backup filename contains invalid characters');
    }

    return base;
  }

  private resolveSafeBackupPath(backupFilepath: string): string {
    const decoded = decodeURIComponent(backupFilepath).trim();
    if (!decoded) throw new Error('Backup filepath cannot be empty');

    const resolvedPath = path.resolve(decoded);
    const backupRoot = path.resolve(this.backupDir);
    const backupRootWithSeparator = `${backupRoot}${path.sep}`;
    if (
      resolvedPath !== backupRoot &&
      !resolvedPath.startsWith(backupRootWithSeparator)
    ) {
      throw new Error('Backup filepath is outside the backup directory');
    }

    return resolvedPath;
  }

  private runPgCommand(command: string, args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...process.env,
          PGPASSWORD: this.databasePassword,
        },
      });

      let stderr = '';
      child.stderr.on('data', (chunk: Buffer | string) => {
        stderr += chunk.toString();
      });

      child.on('error', (error) => {
        reject(error);
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve();
          return;
        }

        reject(
          new Error(
            `${command} failed with exit code ${code}. ${stderr.trim() || 'No stderr output.'}`,
          ),
        );
      });
    });
  }

  // Shared by `createFullBackup` and `createSchemaBackup` — both name their
  // output file the same way (a sanitized, timestamped `backup-<kind>-*`
  // name under `backupDir`), differing only in the kind label and extension,
  // so the naming step lives in one place rather than the two drifting apart.
  private buildBackupFilepath(
    filename: string | undefined,
    kind: 'full' | 'schema',
    extension: string,
  ): { backupFilename: string; filepath: string } {
    const timestamp = this.clock.now().toISOString().replace(/[:.]/g, '-');
    const backupFilename = this.sanitizeBackupFilename(
      filename || `backup-${kind}-${timestamp}.${extension}`,
    );
    return {
      backupFilename,
      filepath: path.join(this.backupDir, backupFilename),
    };
  }

  // Shared by `createFullBackup`, `createSchemaBackup`, and
  // `restoreFromBackup` — all three invoke a `pg_*` CLI against the same
  // configured database, so the connection-flag prefix lives in one place
  // rather than the three commands drifting apart.
  private buildPgConnectionArgs(): string[] {
    return [
      '--host',
      this.databaseHost,
      '--port',
      this.databasePort,
      '--username',
      this.databaseUser,
    ];
  }

  async createFullBackup(
    filename?: string,
  ): Promise<{ success: boolean; filepath: string; size: number }> {
    const { backupFilename, filepath } = this.buildBackupFilepath(
      filename,
      'full',
      'dump',
    );
    const startTime = Date.now();

    try {
      await this.runPgCommand('pg_dump', [
        ...this.buildPgConnectionArgs(),
        '--format',
        'custom',
        '--compress',
        '9',
        '--file',
        filepath,
        this.databaseName,
      ]);

      const stats = fs.statSync(filepath);
      this.backupSuccessGauge.set(Date.now() / 1000);
      this.backupSizeGauge.set(stats.size);
      this.backupDurationHistogram.observe((Date.now() - startTime) / 1000);

      this.logger.log(
        `Full backup created: ${backupFilename} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`,
      );

      return { success: true, filepath, size: stats.size };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Full backup failed: ${errorMsg}`);
      throw error;
    }
  }

  async createSchemaBackup(
    filename?: string,
  ): Promise<{ success: boolean; filepath: string; size: number }> {
    const { backupFilename, filepath } = this.buildBackupFilepath(
      filename,
      'schema',
      'sql',
    );

    try {
      await this.runPgCommand('pg_dump', [
        ...this.buildPgConnectionArgs(),
        '--schema-only',
        '--file',
        filepath,
        this.databaseName,
      ]);

      const stats = fs.statSync(filepath);
      this.logger.log(
        `Schema backup created: ${backupFilename} (${(stats.size / 1024).toFixed(2)} KB)`,
      );

      return { success: true, filepath, size: stats.size };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Schema backup failed: ${errorMsg}`);
      throw error;
    }
  }

  async restoreFromBackup(
    backupFilepath: string,
  ): Promise<{ success: boolean; message: string }> {
    const safeBackupFilepath = this.resolveSafeBackupPath(backupFilepath);
    if (!fs.existsSync(safeBackupFilepath)) {
      throw new Error(`Backup file not found: ${safeBackupFilepath}`);
    }

    try {
      this.logger.warn(`Starting database restore from: ${safeBackupFilepath}`);

      await this.runPgCommand('pg_restore', [
        ...this.buildPgConnectionArgs(),
        '--dbname',
        this.databaseName,
        '--verbose',
        safeBackupFilepath,
      ]);

      this.logger.log(
        `Database restored successfully from: ${safeBackupFilepath}`,
      );
      return {
        success: true,
        message: `Database restored from ${path.basename(safeBackupFilepath)}`,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Database restore failed: ${errorMsg}`);
      throw error;
    }
  }

  async verifyBackup(
    backupFilepath: string,
  ): Promise<{ success: boolean; valid: boolean; message: string }> {
    const safeBackupFilepath = this.resolveSafeBackupPath(backupFilepath);
    if (!fs.existsSync(safeBackupFilepath)) {
      return { success: false, valid: false, message: 'Backup file not found' };
    }

    try {
      await this.runPgCommand('pg_restore', ['--list', safeBackupFilepath]);

      this.logger.log(`Backup verification passed: ${safeBackupFilepath}`);
      return {
        success: true,
        valid: true,
        message: 'Backup is valid and readable',
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Backup verification failed: ${errorMsg}`);
      return {
        success: true,
        valid: false,
        message: `Backup is corrupted: ${errorMsg}`,
      };
    }
  }

  getAvailableBackups(): Array<{
    filename: string;
    size: number;
    created: Date;
  }> {
    try {
      const files = fs.readdirSync(this.backupDir);
      return files
        .filter((f) => f.startsWith('backup-'))
        .map((f) => {
          const filepath = path.join(this.backupDir, f);
          const stats = fs.statSync(filepath);
          return {
            filename: f,
            size: stats.size,
            created: stats.birthtime,
          };
        })
        .sort((a, b) => b.created.getTime() - a.created.getTime());
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to list backups: ${errorMsg}`);
      return [];
    }
  }

  cleanupOldBackups(): { deleted: number; freedSpace: number } {
    const retentionMs = this.retentionDays * 24 * 60 * 60 * 1000;
    const now = Date.now();
    let deletedCount = 0;
    let freedSpace = 0;

    try {
      const files = fs.readdirSync(this.backupDir);
      for (const f of files) {
        if (!f.startsWith('backup-')) continue;

        const filepath = path.join(this.backupDir, f);
        const stats = fs.statSync(filepath);

        if (now - stats.birthtime.getTime() > retentionMs) {
          fs.unlinkSync(filepath);
          deletedCount++;
          freedSpace += stats.size;
          this.logger.log(
            `Deleted old backup: ${f} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`,
          );
        }
      }

      if (deletedCount > 0) {
        this.logger.log(
          `Cleanup complete: deleted ${deletedCount} backups, freed ${(freedSpace / 1024 / 1024).toFixed(2)} MB`,
        );
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Backup cleanup failed: ${errorMsg}`);
    }

    return { deleted: deletedCount, freedSpace };
  }
}
