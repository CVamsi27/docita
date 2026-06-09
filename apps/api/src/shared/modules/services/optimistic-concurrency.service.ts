import { ConflictException } from '@nestjs/common';

export class ConcurrencyConflictException extends ConflictException {
  constructor(
    entityName: string,
    id: string,
    expectedVersion: number,
    currentVersion: number,
  ) {
    super({
      statusCode: 409,
      message: `Concurrency conflict: ${entityName} with ID ${id} has been modified (version mismatch: expected ${expectedVersion}, current ${currentVersion}). Please refresh and try again.`,
      error: 'Conflict',
    });
  }
}

export class OptimisticConcurrencyService {
  validateVersion(
    currentVersion: number,
    providedVersion: number,
    entityName: string,
    entityId: string,
  ): void {
    if (providedVersion !== currentVersion)
      throw new ConcurrencyConflictException(
        entityName,
        entityId,
        providedVersion,
        currentVersion,
      );
  }

  getVersionIncrement(): { increment: number } {
    return { increment: 1 };
  }

  extractVersionFromDto(dto: Record<string, unknown>): number | undefined {
    const version = dto?.version;
    return typeof version === 'number' ? version : undefined;
  }
}
