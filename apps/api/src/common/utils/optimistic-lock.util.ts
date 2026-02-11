import { ConflictException } from '@nestjs/common';

/**
 * Custom exception for optimistic locking conflicts
 */
export class OptimisticLockException extends ConflictException {
  constructor(resourceType: string, version: number) {
    super(
      `The ${resourceType} has been modified by another user. Expected version ${version}, but the resource has been updated. Please refresh and try again.`,
    );
  }
}

/**
 * Validates version for optimistic concurrency control
 * @param currentVersion The current version from the database
 * @param expectedVersion The expected version from the client
 * @param resourceType The type of resource (for error messages)
 * @throws OptimisticLockException if versions don't match
 */
export function validateVersion(
  currentVersion: number,
  expectedVersion: number,
  resourceType: string,
): void {
  if (currentVersion !== expectedVersion) {
    throw new OptimisticLockException(resourceType, expectedVersion);
  }
}
