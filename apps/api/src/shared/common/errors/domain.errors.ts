/**
 * Framework-free domain errors. Map to HTTP status in HttpExceptionFilter.
 */
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainError';
  }
}

export class InvariantViolationError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = 'InvariantViolationError';
  }
}

export class NotFoundDomainError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundDomainError';
  }
}
