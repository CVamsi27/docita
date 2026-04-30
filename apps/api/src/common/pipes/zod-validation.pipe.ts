import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  Logger,
} from '@nestjs/common';
import { ZodSchema, ZodError } from 'zod';
import { createZodValidationException } from '@/common/utils/zod-exception.util';

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
      const fieldPaths =
        zodError?.issues
          ?.map((issue) => issue.path.join('.'))
          .filter(Boolean) ?? [];
      const uniqueFields = [...new Set(fieldPaths)].slice(0, 10);

      // Never log validation issue details; they may contain PHI.
      this.logger.warn('[ZodValidationPipe] Validation error', {
        path: metadata.type,
        issueCount: zodError?.issues?.length ?? 0,
        fields: uniqueFields,
      });

      throw createZodValidationException(zodError);
    }
  }
}
