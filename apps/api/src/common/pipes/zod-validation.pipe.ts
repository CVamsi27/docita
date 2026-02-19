import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  Logger,
} from '@nestjs/common';
import { ZodSchema, ZodError } from 'zod';
import { createZodValidationException } from '../utils/zod-exception.util';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  private readonly logger = new Logger(ZodValidationPipe.name);

  constructor(private schema: ZodSchema) {}

  transform(value: unknown, metadata: ArgumentMetadata) {
    try {
      const parsedValue = this.schema.parse(value);
      return parsedValue;
    } catch (error) {
      const zodError = error as ZodError;
      this.logger.error('[ZodValidationPipe] Validation error', {
        path: metadata.type,
        errors: zodError?.errors,
        value: value,
      });
      // Throw ZodValidationException so AllExceptionsFilter can extract field-level errors
      throw createZodValidationException(zodError);
    }
  }
}
