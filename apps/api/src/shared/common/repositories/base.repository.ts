import { PrismaService } from '@/prisma/prisma.service';
import { WhereClauseOptions } from '@/shared/common/repositories/base-repository.types';
import {
  BaseRepositoryCore,
  type PaginationOptions,
  type PaginatedResult,
} from '@/shared/common/repositories/base-repository.core';

export type { PaginationOptions, PaginatedResult, WhereClauseOptions };

export abstract class BaseRepository<
  T,
  TCreate = Record<string, unknown>,
> extends BaseRepositoryCore<T, TCreate> {
  constructor(prisma: PrismaService, modelName: string) {
    super(prisma, modelName);
  }

  /**
   * Tenant-scoped lookup. `clinicId` is required so that a guessed/leaked id
   * from another tenant cannot match. For genuinely global models (system
   * config, plans), use {@link findOneGlobal} instead — never overload this
   * method with an optional clinicId.
   */
  async findOne(id: string, clinicId: string): Promise<T | null> {
    if (!clinicId) return null;
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
    if (!clinicId) return false;
    const count = await this.model.count({
      where: { id, clinicId },
    });
    return count > 0;
  }
}
