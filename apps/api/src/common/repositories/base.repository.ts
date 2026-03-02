import { PrismaService } from '@/prisma/prisma.service';

export interface PaginationOptions {
  limit?: number;
  cursor?: string;
  search?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  hasMore: boolean;
  nextCursor?: string;
  count?: number;
}

export interface WhereClauseOptions {
  clinicId: string;
  search?: string;
}

type RepositoryModelDelegate = {
  findMany: (args: Record<string, unknown>) => Promise<unknown[]>;
  findUnique: (args: Record<string, unknown>) => Promise<unknown | null>;
  create: (args: Record<string, unknown>) => Promise<unknown>;
  update: (args: Record<string, unknown>) => Promise<unknown>;
  delete: (args: Record<string, unknown>) => Promise<unknown>;
  count: (args: Record<string, unknown>) => Promise<number>;
};

function extractId(item: unknown): string | undefined {
  if (!item || typeof item !== 'object') {
    return undefined;
  }

  const id = (item as { id?: unknown }).id;
  return typeof id === 'string' ? id : undefined;
}

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object') {
    return {};
  }

  return Object.fromEntries(Object.entries(value));
}

export abstract class BaseRepository<T, TCreate = Record<string, unknown>> {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly modelName: string,
  ) {}

  private isRepositoryModelDelegate(
    value: unknown,
  ): value is RepositoryModelDelegate {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const candidate = value as Partial<RepositoryModelDelegate>;

    return (
      typeof candidate.findMany === 'function' &&
      typeof candidate.findUnique === 'function' &&
      typeof candidate.create === 'function' &&
      typeof candidate.update === 'function' &&
      typeof candidate.delete === 'function' &&
      typeof candidate.count === 'function'
    );
  }

  protected get model(): RepositoryModelDelegate {
    const delegate = Reflect.get(this.prisma, this.modelName);

    if (!this.isRepositoryModelDelegate(delegate)) {
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
      items: resultItems as T[],
      hasMore,
      nextCursor,
      count: resultItems.length,
    };
  }

  async findOne(id: string): Promise<T | null> {
    const result = await this.model.findUnique({
      where: { id },
      select: this.getDetailSelect(),
    });
    return result as T | null;
  }

  async findOneOrFail(id: string, entityName?: string): Promise<T> {
    const result = await this.findOne(id);
    if (!result) {
      const name = entityName ?? this.modelName;
      throw new Error(`${name} with ID ${id} not found`);
    }
    return result;
  }

  async create(data: TCreate): Promise<T> {
    const result = await this.model.create({
      data: toRecord(data),
      select: this.getDetailSelect(),
    });
    return result as T;
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    const result = await this.model.update({
      where: { id },
      data,
      select: this.getDetailSelect(),
    });
    return result as T;
  }

  async delete(id: string): Promise<void> {
    await this.model.delete({
      where: { id },
    });
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.model.count({
      where: { id },
    });
    return count > 0;
  }

  async count(where: Record<string, unknown> = {}): Promise<number> {
    return await this.model.count({ where });
  }
}
