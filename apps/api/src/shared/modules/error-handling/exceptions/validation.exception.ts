export class ValidationException extends Error {
  constructor(
    public readonly field: string,
    public readonly message: string,
    public readonly value?: unknown,
  ) {
    super(`Validation failed for ${field}: ${message}`);
    this.name = 'ValidationException';
    Object.setPrototypeOf(this, ValidationException.prototype);
  }
}

export class AggregateValidationException extends Error {
  constructor(public readonly errors: ValidationException[]) {
    super(
      `Validation failed with ${errors.length} error(s): ${errors.map((e) => e.message).join('; ')}`,
    );
    this.name = 'AggregateValidationException';
    Object.setPrototypeOf(this, AggregateValidationException.prototype);
  }
}
