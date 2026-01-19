import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ZodSchema, ZodError } from 'zod';

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
      throw new BadRequestException('Validation failed', {
        cause: error,
        description: zodError?.errors?.map((e) => e.message).join(', '),
      });
    }
  }
}
