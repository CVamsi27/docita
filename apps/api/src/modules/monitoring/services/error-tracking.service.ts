import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma, ErrorSeverity } from '@workspace/db';
import { ErrorLogInput } from '../schemas/monitoring.schema';
import { MonitoringFactory } from '../factories/monitoring.factory';

@Injectable()
export class ErrorTrackingService implements OnModuleDestroy {
  private readonly logger = new Logger(ErrorTrackingService.name);
  private errorBuffer: ErrorLogInput[] = [];
  private readonly BATCH_SIZE = 100;
  private readonly FLUSH_INTERVAL = 5000; // 5 seconds
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(
    private prisma: PrismaService,
    private monitoringFactory: MonitoringFactory,
  ) {
    this.startFlushTimer();
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flushBuffer().catch((error) => {
        this.logger.error('Failed to flush error buffer', error);
      });
    }, this.FLUSH_INTERVAL);
  }

  onModuleDestroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flushBuffer().catch((error) => {
      this.logger.error('Failed to flush errors on shutdown', error);
    });
  }

  logError(data: ErrorLogInput): void {
    const validatedData = this.monitoringFactory.createErrorLog(data);
    this.errorBuffer.push(validatedData);

    if (this.errorBuffer.length >= this.BATCH_SIZE) {
      this.flushBuffer().catch((error) => {
        this.logger.error('Failed to flush error buffer', error);
      });
    }
  }

  async flushBuffer(): Promise<void> {
    if (this.errorBuffer.length === 0) return;

    const errorsToFlush = this.errorBuffer.splice(0, this.BATCH_SIZE);

    try {
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
          requestBody: err.requestBody as Prisma.InputJsonValue,
          metadata: err.metadata as Prisma.InputJsonValue,
          severity: (err.severity as ErrorSeverity) || ErrorSeverity.ERROR,
        })),
        skipDuplicates: true,
      });

      this.logger.debug(`Flushed ${errorsToFlush.length} errors`);
    } catch (error) {
      this.logger.error('Failed to write errors to database', error);
    }
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

    // Get error trend by day
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
        resolvedAt: new Date(),
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
        resolvedAt: new Date(),
      },
    });
    return { success: true, count: result.count };
  }

  async cleanupOldErrors(daysToKeep: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.prisma.errorLog.deleteMany({
      where: { createdAt: { lt: cutoffDate }, resolved: true },
    });

    return result.count;
  }
}
