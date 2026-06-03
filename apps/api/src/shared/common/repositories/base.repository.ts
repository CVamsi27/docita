import { PrismaService } from '@/prisma/prisma.service';
import {
  PaginationOptions,
  PaginatedResult,
  WhereClauseOptions,
  RepositoryModelDelegate,
  isRepositoryModelDelegate,
} from '@/shared/common/repositories/base-repository.types';
import {
  extractId,
  toRecord,
} from '@/shared/common/repositories/base-repository.utils';
import { mapRepositoryDomainItem } from '@/shared/common/repositories/repository-domain-item.boundary';

export type { PaginationOptions, PaginatedResult, WhereClauseOptions };

export abstract class BaseRepository<T, TCreate = Record<string, unknown>> {
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

  /**
   * Tenant-scoped lookup. `clinicId` is required so that a guessed/leaked id
   * from another tenant cannot match. For genuinely global models (system
   * config, plans), use {@link findOneGlobal} instead — never overload this
   * method with an optional clinicId.
   */
  async findOne(id: string, clinicId: string): Promise<T | null> {
    if (!clinicId) {
      return null;
    }
    const result = await this.model.findFirst({
      where: { id, clinicId },
      select: this.getDetailSelect(),
    });
    return result ? this.mapDomainItem(result) : null;
  }

  async findOneOrFail(
    id: string,
    clinicId: string,
    entityName?: string,
  ): Promise<T> {
    const result = await this.findOne(id, clinicId);
    if (!result) {
      const name = entityName ?? this.modelName;
      throw new Error(`${name} with ID ${id} not found`);
    }
    return result;
  }

  /**
   * Escape hatch for global (non-tenant-scoped) models such as system config,
   * plans, or shared lookup tables. Do not use for any model carrying PHI or
   * clinic-specific data.
   */
  async findOneGlobal(id: string): Promise<T | null> {
    const result = await this.model.findFirst({
      where: { id },
      select: this.getDetailSelect(),
    });
    return result ? this.mapDomainItem(result) : null;
  }

  async create(data: TCreate): Promise<T> {
    const result = await this.model.create({
      data: toRecord(data),
      select: this.getDetailSelect(),
    });
    return this.mapDomainItem(result);
  }

  async update(id: string, clinicId: string, data: Partial<T>): Promise<T> {
    if (!clinicId) {
      throw new Error(
        `${this.modelName}.update requires clinicId for tenant scoping`,
      );
    }
    const result = await this.model.updateMany({
      where: { id, clinicId },
      data,
    });
    if (result.count === 0) {
      throw new Error(`${this.modelName} with ID ${id} not found`);
    }

    return await this.findOneOrFail(id, clinicId);
  }

  async delete(id: string, clinicId: string): Promise<void> {
    if (!clinicId) {
      throw new Error(
        `${this.modelName}.delete requires clinicId for tenant scoping`,
      );
    }
    await this.model.deleteMany({
      where: { id, clinicId },
    });
  }

  async exists(id: string, clinicId: string): Promise<boolean> {
    if (!clinicId) {
      return false;
    }
    const count = await this.model.count({
      where: { id, clinicId },
    });
    return count > 0;
  }

  async count(where: Record<string, unknown> = {}): Promise<number> {
    return await this.model.count({ where });
  }
}
