import { PrismaService } from '../../prisma/prisma.service';

/**
 * Pagination options for list queries
 */
export interface PaginationOptions {
  limit?: number;
  cursor?: string;
  search?: string;
}

/**
 * Result of a paginated query
 */
export interface PaginatedResult<T> {
  items: T[];
  hasMore: boolean;
  nextCursor?: string;
  count?: number;
}

/**
 * Options for building where clauses
 */
export interface WhereClauseOptions {
  clinicId: string;
  search?: string;
}

/**
 * Base repository providing common CRUD operations.
 *
 * Extend this class to create entity-specific repositories.
 * This enforces separation of concerns: repositories handle data access,
 * services handle business logic.
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class PatientsRepository extends BaseRepository<Patient> {
 *   constructor(prisma: PrismaService) {
 *     super(prisma, 'patient');
 *   }
 *
 *   protected getSearchFields(): string[] {
 *     return ['firstName', 'lastName', 'phoneNumber', 'email'];
 *   }
 * }
 * ```
 */
export abstract class BaseRepository<T> {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly modelName: string,
  ) {}

  /**
   * Get the Prisma model delegate
   */
  protected get model() {
    return (this.prisma as any)[this.modelName];
  }

  /**
   * Build search OR conditions for text search
   * Override in subclass to customize search fields
   */
  protected buildSearchConditions(
    search: string,
  ): Record<string, { contains: string; mode: 'insensitive' }>[] {
    const fields = this.getSearchFields();
    return fields.map((field) => ({
      [field]: { contains: search, mode: 'insensitive' as const },
    }));
  }

  /**
   * Override this to specify which fields to search
   */
  protected getSearchFields(): string[] {
    return ['name'];
  }

  /**
   * Override this to specify the default select fragment
   */
  protected getDefaultSelect(): Record<string, boolean | object> | undefined {
    return undefined;
  }

  /**
   * Override this to specify the detail select fragment (for findOne)
   */
  protected getDetailSelect(): Record<string, boolean | object> | undefined {
    return this.getDefaultSelect();
  }

  /**
   * Find all records with pagination and optional search
   */
  async findAll(
    clinicId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<T>> {
    if (!clinicId) {
      return { items: [], hasMore: false, count: 0 };
    }

    const limit = options?.limit ?? 50;
    const where: Record<string, unknown> = { clinicId };

    // Add search conditions if provided
    if (options?.search) {
      where.OR = this.buildSearchConditions(options.search);
    }

    // Add cursor if provided
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
      ? resultItems[resultItems.length - 1]?.id
      : undefined;

    return {
      items: resultItems as T[],
      hasMore,
      nextCursor,
      count: resultItems.length,
    };
  }

  /**
   * Find a single record by ID
   */
  async findOne(id: string): Promise<T | null> {
    const result = await this.model.findUnique({
      where: { id },
      select: this.getDetailSelect(),
    });
    return result as T | null;
  }

  /**
   * Find a single record by ID, throwing if not found
   */
  async findOneOrFail(id: string, entityName?: string): Promise<T> {
    const result = await this.findOne(id);
    if (!result) {
      const name = entityName ?? this.modelName;
      throw new Error(`${name} with ID ${id} not found`);
    }
    return result;
  }

  /**
   * Create a new record
   * Override in subclass with specific DTO type
   */

  async create(data: Record<string, any>): Promise<T> {
    const result = await this.model.create({
      data,
      select: this.getDetailSelect(),
    });
    return result as T;
  }

  /**
   * Update a record by ID
   */
  async update(id: string, data: Partial<T>): Promise<T> {
    const result = await this.model.update({
      where: { id },
      data,
      select: this.getDetailSelect(),
    });
    return result as T;
  }

  /**
   * Delete a record by ID
   */
  async delete(id: string): Promise<void> {
    await this.model.delete({
      where: { id },
    });
  }

  /**
   * Check if a record exists
   */
  async exists(id: string): Promise<boolean> {
    const count = await this.model.count({
      where: { id },
    });
    return count > 0;
  }

  /**
   * Count records matching a condition
   */
  async count(where: Record<string, unknown> = {}): Promise<number> {
    return await this.model.count({ where });
  }
}
