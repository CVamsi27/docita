import { NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { PaginatedResult } from '../database/repositories/base.repository';
import { paginateWithCursor } from '../database/pagination.helper';

/**
 * Standard pagination options used across all services
 */
export interface ServicePaginationOptions {
  cursor?: string;
  limit?: number;
  search?: string;
}

/**
 * Context for operations - provides clinic and user info
 */
export interface OperationContext {
  clinicId: string;
  userId?: string;
}

/**
 * Base service providing common CRUD operations with standardized patterns.
 *
 * This eliminates duplication across services by providing:
 * - Consistent clinic ID validation
 * - Standardized not-found error handling
 * - Common pagination patterns
 * - Template method pattern for extensibility
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class PatientsService extends BaseService<Patient> {
 *   constructor(prisma: PrismaService) {
 *     super(prisma, 'patient', 'Patient');
 *   }
 *
 *   protected getListSelect() {
 *     return PATIENT_LIST_SELECT;
 *   }
 * }
 * ```
 */
export abstract class BaseService<T> {
  protected readonly logger: Logger;

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly modelName: string,
    protected readonly entityName: string,
  ) {
    this.logger = new Logger(this.constructor.name);
  }

  /**
   * Get the Prisma model delegate
   */
  protected get model() {
    return (this.prisma as any)[this.modelName];
  }

  /**
   * Validate clinic ID and return empty result if missing
   * Override this to customize the empty result shape
   */
  protected getEmptyResult(): PaginatedResult<T> {
    return { items: [], hasMore: false, count: 0 };
  }

  /**
   * Validate clinic ID - returns true if valid, false if should return empty
   */
  protected validateClinicId(clinicId: string | undefined): boolean {
    return !!clinicId;
  }

  /**
   * Throw standardized not found exception
   */
  protected throwNotFound(id: string): never {
    throw new NotFoundException(`${this.entityName} with ID ${id} not found`);
  }

  /**
   * Abstract methods - must be implemented by subclasses
   */
  protected abstract getListSelect(): Record<string, any>;
  protected abstract getDetailSelect(): Record<string, any>;

  /**
   * Override to customize how clinicId is used in where clause
   * Default assumes direct clinicId field
   */
  protected buildClinicWhereClause(clinicId: string): Record<string, any> {
    return { clinicId };
  }

  /**
   * Override to add additional search conditions
   */
  protected buildSearchConditions(_search: string): Record<string, any>[] {
    return [];
  }

  /**
   * Override to customize order by clause
   */
  protected getDefaultOrderBy(): Record<string, 'asc' | 'desc'> {
    return { createdAt: 'desc' };
  }

  /**
   * Find all entities with pagination
   * Automatically handles empty clinicId
   */
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

  /**
   * Find a single entity by ID
   * Throws NotFoundException if not found
   */
  async findOne(id: string): Promise<T> {
    const entity = await this.model.findUnique({
      where: { id },
      select: this.getDetailSelect(),
    });

    if (!entity) {
      this.throwNotFound(id);
    }

    return entity as T;
  }

  /**
   * Find a single entity by ID, returns null if not found
   */
  async findOneOrNull(id: string): Promise<T | null> {
    return this.model.findUnique({
      where: { id },
      select: this.getDetailSelect(),
    }) as Promise<T | null>;
  }

  /**
   * Check if entity exists
   */
  async exists(id: string): Promise<boolean> {
    const count = await this.model.count({ where: { id } });
    return count > 0;
  }

  /**
   * Delete an entity by ID
   * Returns the deleted entity
   */
  async delete(id: string): Promise<T> {
    // Verify it exists first
    await this.findOne(id);
    return this.model.delete({ where: { id } }) as Promise<T>;
  }
}
