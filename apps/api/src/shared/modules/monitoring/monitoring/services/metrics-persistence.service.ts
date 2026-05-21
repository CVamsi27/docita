import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma } from '@workspace/db';
import { isRecord } from '@workspace/utils';

@Injectable()
export class MetricsPersistenceService {
  private readonly logger = new Logger(MetricsPersistenceService.name);
  private persistenceDisabled = false;

  constructor(private readonly prisma: PrismaService) {}

  isDisabled(): boolean {
    return this.persistenceDisabled;
  }

  async create(
    data: Prisma.SystemMetricCreateInput,
    errorContext: string,
  ): Promise<void> {
    if (this.persistenceDisabled) {
      return;
    }

    try {
      await this.prisma.systemMetric.create({ data });
    } catch (error) {
      this.handlePersistenceError(error, errorContext);
    }
  }

  async createMany(
    data: Prisma.SystemMetricCreateManyInput[],
    errorContext: string,
  ): Promise<void> {
    if (this.persistenceDisabled) {
      return;
    }

    try {
      await this.prisma.systemMetric.createMany({ data });
    } catch (error) {
      this.handlePersistenceError(error, errorContext);
    }
  }

  private handlePersistenceError(error: unknown, context: string): void {
    if (this.isDatabaseAuthError(error)) {
      this.persistenceDisabled = true;
      this.logger.warn(
        'Disabling metrics database persistence due to database authentication failure. Verify DATABASE_URL credentials.',
      );
      return;
    }

    this.logger.error(context, error);
  }

  private isDatabaseAuthError(error: unknown): boolean {
    if (!isRecord(error)) {
      return false;
    }

    const code = typeof error.code === 'string' ? error.code : '';
    const message =
      typeof error.message === 'string' ? error.message.toLowerCase() : '';

    if (code === 'P1000') {
      return true;
    }

    return (
      message.includes('authentication failed against the database server') ||
      message.includes('database credentials') ||
      message.includes('password authentication failed')
    );
  }
}
