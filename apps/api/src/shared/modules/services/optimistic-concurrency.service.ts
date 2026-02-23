import { ConflictException } from '@nestjs/common';

/**
 * Optimistic Concurrency Control Error
 * Thrown when a version mismatch is detected during update operations
 */
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

/**
 * Service for handling optimistic concurrency control
 */
export class OptimisticConcurrencyService {
  /**
   * Validates that the provided version matches the current version
   * Used before performing update operations
   */
  validateVersion(
    currentVersion: number,
    providedVersion: number,
    entityName: string,
    entityId: string,
  ): void {
    if (providedVersion !== currentVersion) {
      throw new ConcurrencyConflictException(
        entityName,
        entityId,
        providedVersion,
        currentVersion,
      );
    }
  }

  /**
   * Increments version for database update
   * Used in update queries: version: { increment: 1 }
   */
  getVersionIncrement(): { increment: number } {
    return { increment: 1 };
  }

  /**
   * Extracts version from request DTO
   * Clients should provide the version they last saw
   */
  extractVersionFromDto(dto: Record<string, unknown>): number | undefined {
    return dto?.version as number | undefined;
  }
}
