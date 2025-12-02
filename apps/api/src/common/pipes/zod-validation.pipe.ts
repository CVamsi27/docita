import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { ZodSchema } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown, metadata: ArgumentMetadata) {
    try {
      const parsedValue = this.schema.parse(value);
      return parsedValue;
    } catch (error) {
      console.error('[ZodValidationPipe] Validation error:', {
        path: metadata.type,
        errors: error.errors,
        value: value,
      });
      throw new BadRequestException('Validation failed', {
        cause: error,
        description: error.errors?.map((e: any) => e.message).join(', '),
      });
    }
  }
}
