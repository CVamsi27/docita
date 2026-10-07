import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma, ErrorSeverity } from '@workspace/db';
import { toPrismaInputJsonValue } from '@/shared/common/json/to-prisma-input-json-value';
import { parseStringEnumMember } from '@workspace/utils';

const ERROR_SEVERITY_VALUES = Object.values(ErrorSeverity);
import { ErrorLogInput } from '@/shared/modules/monitoring/monitoring/schemas/monitoring.schema';
import { MonitoringFactory } from '@/shared/modules/monitoring/monitoring/factories/monitoring.factory';
import { TelemetryCaptureRecorder } from '@/shared/modules/monitoring/monitoring/services/telemetry-capture-recorder.service';

@Injectable()
export class ErrorTrackingService implements OnModuleDestroy {
  private readonly logger = new Logger(ErrorTrackingService.name);
  private errorBuffer: ErrorLogInput[] = [];
  private readonly BATCH_SIZE = 100;
  private readonly FLUSH_INTERVAL = 5000;
  private flushTimer: NodeJS.Timeout | null = null;
  private persistenceDisabled = false;
  private droppedWhileDisabled = 0;

  constructor(
    private prisma: PrismaService,
    private monitoringFactory: MonitoringFactory,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
    private readonly captureRecorder: TelemetryCaptureRecorder,
  ) {
    this.startFlushTimer();
  }

  private formatError(error: unknown): string {
    if (error instanceof Error) {
      return `${error.name}: ${error.message}`;
    }

    return String(error);
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flushBuffer().catch((error) => {
        this.logger.error(
          `Failed to flush error buffer: ${this.formatError(error)}`,
          // jscpd:ignore-start
        );
      });
    }, this.FLUSH_INTERVAL);
    this.flushTimer.unref?.();
  }

  onModuleDestroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flushBuffer().catch((error) => {
      this.logger.error(
        `Failed to flush errors on shutdown: ${this.formatError(error)}`,
        // jscpd:ignore-end
      );
    });
  }

  logError(data: ErrorLogInput): void {
    if (this.persistenceDisabled) {
      // Capture is off: count the loss instead of buffering without bound or
      // returning silently, which is what made the gap unreportable.
      this.droppedWhileDisabled += 1;
      return;
    }

    let validatedData: ErrorLogInput;
    try {
      validatedData = this.monitoringFactory.createErrorLog(data);
    } catch (error) {
      this.logger.warn(
        'Skipping malformed error-log payload in monitoring pipeline',
        error instanceof Error ? error.message : String(error),
      );
      return;
    }

    this.errorBuffer.push(validatedData);

    if (this.errorBuffer.length >= this.BATCH_SIZE) {
      this.flushBuffer().catch((error) => {
        this.logger.error(
          `Failed to flush error buffer: ${this.formatError(error)}`,
        );
      });
    }
  }

  /**
   * Slices the batch instead of splicing it, and splices only after a
   * successful write. Splicing first meant a single transient failure
   * permanently discarded up to 100 error rows with no record — the opposite of
   * what an error log is for.
   */
  async flushBuffer(): Promise<void> {
    if (this.persistenceDisabled || this.errorBuffer.length === 0) return;
    const errorsToFlush = this.errorBuffer.slice(0, this.BATCH_SIZE);
    try {
      const writeLogs = async () => {
        await this.prisma.errorLog.createMany({
          data: errorsToFlush.map((err) => ({
            clinicId: err.clinicId,
            userId: err.userId,
            type: err.type,
            message: err.message,
            stack: err.stack,
            path: err.path,
            method: err.method,
            statusCode: err.statusCode,
            userAgent: err.userAgent,
            ip: err.ip,
            ...(err.requestBody != null
              ? { requestBody: toPrismaInputJsonValue(err.requestBody) }
              : {}),
            ...(err.metadata != null
              ? { metadata: toPrismaInputJsonValue(err.metadata) }
              : {}),
            severity:
              parseStringEnumMember(
                ERROR_SEVERITY_VALUES,
                err.severity ?? '',
              ) ?? ErrorSeverity.ERROR,
            // Joins this error to the ApiRequest row for the same request
            // without carrying extra identity on either side.
            correlationId: err.correlationId ?? null,
          })),
          skipDuplicates: true,
        });
      };
      if (typeof this.prisma.runUnrestricted === 'function') {
        // RLS-BYPASS: system telemetry and error logs are not clinic-scoped
        await this.prisma.runUnrestricted(writeLogs);
      } else {
        await writeLogs();
      }
      this.errorBuffer.splice(0, errorsToFlush.length);
      await this.captureRecorder.flushPending();
      this.logger.debug(`Flushed ${errorsToFlush.length} errors`);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2021'
      ) {
        this.disablePersistence(
          'ErrorLog table not available. Disabling error persistence and continuing without DB-backed error tracking.',
          'MISSING_MONITORING_TABLES',
        );
        return;
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P1000'
      ) {
        this.disablePersistence(
          'Disabling error persistence due to database authentication failure. Verify DATABASE_URL credentials.',
          'DATABASE_AUTH_FAILURE',
        );
        return;
      }
      // Retained for retry: the buffer is untouched on a transient failure.
      this.logger.error(
        `Failed to write errors to database: ${this.formatError(error)}`,
      );
    }
  }

  private disablePersistence(message: string, reason: string): void {
    if (this.persistenceDisabled) {
      return;
    }
    this.persistenceDisabled = true;
    // The buffer is discarded here, which is a real coverage gap. Recording it
    // is what stops the dashboard from reading stale rows as current errors.
    const discarded = this.errorBuffer.length;
    this.droppedWhileDisabled += discarded;
    this.errorBuffer = [];
    this.logger.warn(message);
    this.captureRecorder.recordDisabled(reason, discarded, 0).catch((error) => {
      this.logger.warn(
        `Could not record error-log capture loss: ${this.formatError(error)}`,
      );
    });
  }

  /** Errors this process knows it failed to persist. */
  getDroppedErrorCount(): number {
    return this.droppedWhileDisabled;
  }

  async getErrorStats(
    startDate?: Date,
    endDate?: Date,
    clinicId?: string,
  ): Promise<{
    totalErrors: number;
    unresolvedErrors: number;
    errorsBySeverity: { severity: string; count: number }[];
    errorsByType: { type: string; count: number }[];
    recentErrors: {
      id: string;
      type: string;
      message: string;
      path?: string;
      severity: string;
      createdAt: Date;
    }[];
    errorTrend: { date: string; count: number }[];
  }> {
    const where: Prisma.ErrorLogWhereInput = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }
    if (clinicId) where.clinicId = clinicId;

    const [
      totalErrors,
      unresolvedErrors,
      errorsBySeverity,
      errorsByType,
      recentErrors,
    ] = await Promise.all([
      this.prisma.errorLog.count({ where }),
      this.prisma.errorLog.count({ where: { ...where, resolved: false } }),
      this.prisma.errorLog.groupBy({
        by: ['severity'],
        where,
        _count: { id: true },
      }),
      this.prisma.errorLog.groupBy({
        by: ['type'],
        where,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
      this.prisma.errorLog.findMany({
        where,
        select: {
          id: true,
          type: true,
          message: true,
          path: true,
          severity: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    const errorsRaw = await this.prisma.errorLog.findMany({
      where,
      select: { createdAt: true },
    });

    const dateCounts = new Map<string, number>();
    errorsRaw.forEach((e) => {
      const date = e.createdAt.toISOString().split('T')[0];
      dateCounts.set(date, (dateCounts.get(date) || 0) + 1);
    });

    const errorTrend = Array.from(dateCounts.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalErrors,
      unresolvedErrors,
      errorsBySeverity: errorsBySeverity.map((e) => ({
        severity: e.severity,
        count: e._count.id,
      })),
      errorsByType: errorsByType.map((e) => ({
        type: e.type,
        count: e._count.id,
      })),
      recentErrors: recentErrors.map((e) => ({
        ...e,
        path: e.path ?? undefined,
      })),
      errorTrend,
    };
  }

  async resolveError(
    errorId: string,
    resolvedBy: string,
  ): Promise<{ success: boolean }> {
    await this.prisma.errorLog.update({
      where: { id: errorId },
      data: {
        resolved: true,
        resolvedBy,
        resolvedAt: this.clock.now(),
      },
    });
    return { success: true };
  }

  async resolveMultipleErrors(
    errorIds: string[],
    resolvedBy: string,
  ): Promise<{ success: boolean; count: number }> {
    const result = await this.prisma.errorLog.updateMany({
      where: { id: { in: errorIds } },
      data: {
        resolved: true,
        resolvedBy,
        resolvedAt: this.clock.now(),
      },
    });
    return { success: true, count: result.count };
  }

  async cleanupOldErrors(daysToKeep: number): Promise<number> {
    const cutoffDate = this.clock.now();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    // RLS-BYPASS: system telemetry and error logs are not clinic-scoped
    const result = await this.prisma.runUnrestricted(async () =>
      this.prisma.errorLog.deleteMany({
        where: { createdAt: { lt: cutoffDate }, resolved: true },
      }),
    );

    return result.count;
  }
}
