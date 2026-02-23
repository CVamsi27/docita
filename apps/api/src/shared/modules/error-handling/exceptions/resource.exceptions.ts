/**
 * Not Found Exception
 * Thrown when a requested resource is not found
 */

export class NotFoundException extends Error {
  constructor(
    public readonly resourceType: string,
    public readonly resourceId: string | number,
  ) {
    super(`${resourceType} with ID ${resourceId} not found`);
    this.name = 'NotFoundException';
    Object.setPrototypeOf(this, NotFoundException.prototype);
  }
}

/**
 * Conflict Exception
 * Thrown when a resource already exists or violates unique constraints
 */
export class ConflictException extends Error {
  constructor(
    public readonly resourceType: string,
    public readonly reason: string,
  ) {
    super(`${resourceType} already exists: ${reason}`);
    this.name = 'ConflictException';
    Object.setPrototypeOf(this, ConflictException.prototype);
  }
}
