import { PrismaService } from '@/prisma/prisma.service';
import {
  PaginationOptions,
  PaginatedResult,
  RepositoryModelDelegate,
  isRepositoryModelDelegate,
} from '@/shared/common/repositories/base-repository.types';
import {
  extractId,
  toRecord,
} from '@/shared/common/repositories/base-repository.utils';
import { mapRepositoryDomainItem } from '@/shared/common/repositories/repository-domain-item.boundary';

export type { PaginationOptions, PaginatedResult };

export abstract class BaseRepositoryCore<T, TCreate = Record<string, unknown>> {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly modelName: string,
  ) {}

  protected get model(): RepositoryModelDelegate {
    const delegate = Reflect.get(this.prisma, this.modelName);

    if (!isRepositoryModelDelegate(delegate)) {
      throw new Error(`Model delegate '${this.modelName}' is unavailable`);
    }

    return delegate;
  }

  protected buildSearchConditions(
    search: string,
  ): Record<string, { contains: string; mode: 'insensitive' }>[] {
    const fields = this.getSearchFields();
    return fields.map((field) => ({
      [field]: { contains: search, mode: 'insensitive' as const },
    }));
  }

  protected getSearchFields(): string[] {
    return ['name'];
  }

  protected getDefaultSelect(): Record<string, boolean | object> | undefined {
    return undefined;
  }

  protected getDetailSelect(): Record<string, boolean | object> | undefined {
    return this.getDefaultSelect();
  }

  protected mapDomainItem(item: unknown): T {
    return mapRepositoryDomainItem<T>(item);
  }

  async findAll(
    clinicId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<T>> {
    if (!clinicId) {
      return { items: [], hasMore: false, count: 0 };
    }

    const limit = options?.limit ?? 50;
    const where: Record<string, unknown> = { clinicId };

    if (options?.search) {
      where.OR = this.buildSearchConditions(options.search);
    }

    const cursor = options?.cursor ? { id: options.cursor } : undefined;

    const items = await this.model.findMany({
      where,
      take: limit + 1,
      cursor,
      skip: cursor ? 1 : 0,
      orderBy: { updatedAt: 'desc' },
      select: this.getDefaultSelect(),
    });

    const hasMore = items.length > limit;
    const resultItems = hasMore ? items.slice(0, -1) : items;
    const nextCursor = hasMore
      ? extractId(resultItems[resultItems.length - 1])
      : undefined;

    return {
      items: resultItems.map((item) => this.mapDomainItem(item)),
      hasMore,
      nextCursor,
      count: resultItems.length,
    };
  }

  async create(data: TCreate): Promise<T> {
    const result = await this.model.create({
      data: toRecord(data),
      select: this.getDetailSelect(),
    });
    return this.mapDomainItem(result);
  }

  async count(where: Record<string, unknown> = {}): Promise<number> {
    return await this.model.count({ where });
  }
}
