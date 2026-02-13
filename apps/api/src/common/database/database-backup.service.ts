/**
 * Database Backup Service
 * Handles point-in-time recovery, backup automation, and verification
 * Supports PgDump for PostgreSQL and backup archival
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

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

  constructor(private configService: ConfigService) {
    this.backupDir =
      configService.get<string>('BACKUP_DIR') || '/backups/postgresql';
    this.retentionDays = parseInt(
      configService.get<string>('BACKUP_RETENTION_DAYS') || '30',
      10,
    );
    this.databasePassword = configService.get<string>('DATABASE_PASSWORD') || '';
    this.databaseHost = configService.get<string>('DATABASE_HOST') || 'localhost';
    this.databasePort = configService.get<string>('DATABASE_PORT') || '5432';
    this.databaseUser = configService.get<string>('DATABASE_USER') || 'postgres';
    this.databaseName = configService.get<string>('DATABASE_NAME') || 'docita';

    this.ensureBackupDirectory();
  }

  /**
   * Ensure backup directory exists with proper permissions
   */
  private ensureBackupDirectory(): void {
    try {
      if (!fs.existsSync(this.backupDir)) {
        fs.mkdirSync(this.backupDir, { recursive: true, mode: 0o755 });
        this.logger.log(`Created backup directory: ${this.backupDir}`);
      }
    } catch (err: any) {
      this.logger.warn(
        `Failed to create configured backup directory ${this.backupDir}: ${err?.message}. Falling back to project-local backups.`,
      );

      const fallback = path.join(process.cwd(), 'backups', 'postgresql');

      try {
        if (!fs.existsSync(fallback)) {
          fs.mkdirSync(fallback, { recursive: true, mode: 0o755 });
        }
        this.backupDir = fallback;
        this.logger.log(`Using fallback backup directory: ${this.backupDir}`);
      } catch (fallbackErr: any) {
        this.logger.error(`Failed to create fallback backup directory: ${fallbackErr?.message}`);
        // Do not throw — allow application to start; operations will fail later with clearer errors
      }
    }
  }

  /**
   * Create a full database backup using pg_dump
   * Stores as custom format for point-in-time recovery support
   */
  async createFullBackup(
    filename?: string,
  ): Promise<{ success: boolean; filepath: string; size: number }> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFilename = filename || `backup-full-${timestamp}.dump`;
    const filepath = path.join(this.backupDir, backupFilename);

    try {
      const pgDumpCmd = `PGPASSWORD="${this.databasePassword}" pg_dump --host="${this.databaseHost}" --port="${this.databasePort}" --username="${this.databaseUser}" --format=custom --compress=9 "${this.databaseName}" > "${filepath}"`;

      await execAsync(pgDumpCmd);

      const stats = fs.statSync(filepath);
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

  /**
   * Create a schema-only backup (useful for quick recovery of structure)
   */
  async createSchemaBackup(
    filename?: string,
  ): Promise<{ success: boolean; filepath: string; size: number }> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFilename = filename || `backup-schema-${timestamp}.sql`;
    const filepath = path.join(this.backupDir, backupFilename);

    try {
      const pgDumpCmd = `PGPASSWORD="${this.databasePassword}" pg_dump --host="${this.databaseHost}" --port="${this.databasePort}" --username="${this.databaseUser}" --schema-only "${this.databaseName}" > "${filepath}"`;

      await execAsync(pgDumpCmd);

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

  /**
   * Restore from a backup file (full database restore)
   * WARNING: This will overwrite existing data. Use with caution.
   */
  async restoreFromBackup(
    backupFilepath: string,
  ): Promise<{ success: boolean; message: string }> {
    if (!fs.existsSync(backupFilepath)) {
      throw new Error(`Backup file not found: ${backupFilepath}`);
    }

    try {
      this.logger.warn(`Starting database restore from: ${backupFilepath}`);

      const pgRestoreCmd = `PGPASSWORD="${this.databasePassword}" pg_restore --host="${this.databaseHost}" --port="${this.databasePort}" --username="${this.databaseUser}" --dbname="${this.databaseName}" --verbose "${backupFilepath}"`;

      await execAsync(pgRestoreCmd);

      this.logger.log(`Database restored successfully from: ${backupFilepath}`);
      return {
        success: true,
        message: `Database restored from ${path.basename(backupFilepath)}`,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Database restore failed: ${errorMsg}`);
      throw error;
    }
  }

  /**
   * Verify backup integrity
   */
  async verifyBackup(
    backupFilepath: string,
  ): Promise<{ success: boolean; valid: boolean; message: string }> {
    if (!fs.existsSync(backupFilepath)) {
      return { success: false, valid: false, message: 'Backup file not found' };
    }

    try {
      const pgRestoreCmd = `PGPASSWORD="${this.databasePassword}" pg_restore --list "${backupFilepath}" > /dev/null 2>&1`;

      await execAsync(pgRestoreCmd);

      this.logger.log(`Backup verification passed: ${backupFilepath}`);
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

  /**
   * Get list of available backups
   */
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

  /**
   * Clean up old backups based on retention policy
   */
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
