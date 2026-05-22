import { ConflictException } from '@nestjs/common';

export class OptimisticLockException extends ConflictException {
  constructor(resourceType: string, version: number) {
    super(
      `The ${resourceType} has been modified by another user. Expected version ${version}, but the resource has been updated. Please refresh and try again.`,
    );
  }
}

export function validateVersion(
  currentVersion: number,
  expectedVersion: number,
  resourceType: string,
): void {
  if (currentVersion !== expectedVersion) {
    throw new OptimisticLockException(resourceType, expectedVersion);
  }
}
