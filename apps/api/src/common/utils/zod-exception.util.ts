import { ZodError } from 'zod';
import { ZodValidationException } from 'nestjs-zod';

/**
 * Creates a ZodValidationException from a raw ZodError.
 *
 * This ensures both the global nestjs-zod pipe and our custom ZodValidationPipe
 * produce the same exception type, so AllExceptionsFilter can extract
 * field-level errors consistently.
 */
export function createZodValidationException(
  zodError: ZodError,
): ZodValidationException {
  return new ZodValidationException(zodError);
}
