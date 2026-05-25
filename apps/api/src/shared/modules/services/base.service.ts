import { NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { isRecord } from '@workspace/utils';
import { PrismaService } from '@/prisma/prisma.service';
import { PaginatedResult } from '@/shared/common/repositories/base.repository';
import { paginateWithCursor } from '@/shared/common/pagination.helper';

export interface ServicePaginationOptions {
  cursor?: string;
  limit?: number;
  search?: string;
}

export interface OperationContext {
  clinicId: string;
  userId?: string;
}

type ServiceModelDelegate<TItem> = {
  findMany: (args?: Record<string, unknown>) => Promise<TItem[]>;
  findFirst: (args?: Record<string, unknown>) => Promise<TItem | null>;
  count: (args?: { where?: Record<string, unknown> }) => Promise<number>;
  deleteMany: (args?: Record<string, unknown>) => Promise<{ count: number }>;
};

export abstract class BaseService<T> {
  protected readonly logger: Logger;

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly modelName: string,
    protected readonly entityName: string,
  ) {
    this.logger = new Logger(this.constructor.name);
  }

  private isServiceModelDelegate(
    value: unknown,
  ): value is ServiceModelDelegate<T> {
    if (!value || typeof value !== 'object') {
      return false;
    }

    return (
      isRecord(value) &&
      typeof value.findMany === 'function' &&
      typeof value.findFirst === 'function' &&
      typeof value.count === 'function' &&
      typeof value.deleteMany === 'function'
    );
  }

  protected get model(): ServiceModelDelegate<T> {
    const delegate = Reflect.get(this.prisma, this.modelName);

    if (!this.isServiceModelDelegate(delegate)) {
      throw new BadRequestException(
        `Model delegate '${this.modelName}' is unavailable`,
      );
    }

    return delegate;
  }

  protected getEmptyResult(): PaginatedResult<T> {
    return { items: [], hasMore: false, count: 0 };
  }

  protected validateClinicId(clinicId: string | undefined): boolean {
    return !!clinicId;
  }

  protected throwNotFound(id: string): never {
    throw new NotFoundException(`${this.entityName} with ID ${id} not found`);
  }

  protected abstract getListSelect(): Record<string, boolean | object>;
  protected abstract getDetailSelect(): Record<string, boolean | object>;

  protected buildClinicWhereClause(clinicId: string): Record<string, unknown> {
    return { clinicId };
  }

  protected buildSearchConditions(_search: string): Record<string, unknown>[] {
    return [];
  }

  protected getDefaultOrderBy(): Record<string, 'asc' | 'desc'> {
    return { createdAt: 'desc' };
  }

  async findAll(
    clinicId: string,
    options?: ServicePaginationOptions,
  ): Promise<PaginatedResult<T>> {
    if (!this.validateClinicId(clinicId)) {
      return this.getEmptyResult();
    }

    const where = {
      ...this.buildClinicWhereClause(clinicId),
      ...(options?.search &&
      this.buildSearchConditions(options.search).length > 0
        ? { OR: this.buildSearchConditions(options.search) }
        : {}),
    };

    return paginateWithCursor({
      model: this.model,
      cursor: options?.cursor,
      limit: options?.limit ?? 50,
      where,
      orderBy: this.getDefaultOrderBy(),
      select: this.getListSelect(),
    });
  }

  async findOne(id: string): Promise<T> {
    const entity = await this.model.findFirst({
      where: { id },
      select: this.getDetailSelect(),
    });

    if (!entity) {
      this.throwNotFound(id);
    }

    return entity;
  }

  async findOneOrNull(id: string): Promise<T | null> {
    return this.model.findFirst({
      where: { id },
      select: this.getDetailSelect(),
    });
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.model.count({ where: { id } });
    return count > 0;
  }

  async delete(id: string): Promise<T> {
    const entity = await this.findOne(id);
    const result = await this.model.deleteMany({ where: { id } });
    if (result.count === 0) {
      this.throwNotFound(id);
    }
    return entity;
  }
}
