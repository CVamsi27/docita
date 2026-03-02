import { ZodError } from 'zod';
import { ZodValidationException } from 'nestjs-zod';

export function createZodValidationException(
  zodError: ZodError,
): ZodValidationException {
  return new ZodValidationException(zodError);
}
