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

  async findOne(id: string): Promise<T | null> {
    const result = await this.model.findFirst({
      where: { id },
      select: this.getDetailSelect(),
    });
    return result ? this.mapDomainItem(result) : null;
  }

  async findOneOrFail(id: string, entityName?: string): Promise<T> {
    const result = await this.findOne(id);
    if (!result) {
      const name = entityName ?? this.modelName;
      throw new Error(`${name} with ID ${id} not found`);
    }
    return result;
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    const result = await this.model.updateMany({
      where: { id },
      data,
    });
    if (result.count === 0) {
      throw new Error(`${this.modelName} with ID ${id} not found`);
    }

    return await this.findOneOrFail(id);
  }

  async delete(id: string): Promise<void> {
    await this.model.deleteMany({
      where: { id },
    });
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.model.count({
      where: { id },
    });
    return count > 0;
  }
}
