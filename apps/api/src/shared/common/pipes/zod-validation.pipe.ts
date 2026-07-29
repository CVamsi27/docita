import { PipeTransform, ArgumentMetadata, Logger } from '@nestjs/common';
import { ZodSchema, ZodError } from 'zod';
import { createZodValidationException } from '@/shared/common/utils/zod-exception.util';

// No `@Injectable()`: the pipe takes a ZodSchema in its constructor and
// is always instantiated directly with `new ZodValidationPipe(schema)`.
// Marking it @Injectable() makes NestJS try to resolve it as a
// parameterless provider, which fails because the schema arg is
// required and not a registered provider.
export class ZodValidationPipe implements PipeTransform {
  private readonly logger = new Logger(ZodValidationPipe.name);

  constructor(private schema: ZodSchema) {}

  transform(value: unknown, metadata: ArgumentMetadata) {
    try {
      const parsedValue = this.schema.parse(value);
      return parsedValue;
    } catch (error) {
      if (!(error instanceof ZodError)) {
        throw error;
      }

      const zodError = error;
      const fieldPaths =
        zodError.issues?.map((issue) => issue.path.join('.')).filter(Boolean) ??
        [];
      const uniqueFields = [...new Set(fieldPaths)].slice(0, 10);

      // Never log validation issue details; they may contain PHI.
      this.logger.warn('[ZodValidationPipe] Validation error', {
        path: metadata.type,
        issueCount: zodError.issues.length,
        fields: uniqueFields,
      });

      throw createZodValidationException(zodError);
    }
  }
}
