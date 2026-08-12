import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { map } from 'rxjs/operators';
import type { Observable } from 'rxjs';
import type { ZodType } from 'zod';

// check-as-cast-density: allow-file — sanctioned seam (P5.2j class): the casts
// bridge nestjs-zod's reflector metadata, which is untyped `unknown` at the
// framework boundary. Each access is guarded by a runtime check
// (`codec`/`schema`/`safeParse`/`array`) before use; closing the seam would
// only relocate the narrowing into duplicate predicates on metadata whose
// shape is defined by a third-party library, not by this codebase.

// Metadata key set by nestjs-zod's `@ZodSerializerDto(...)`.
const ZOD_SERIALIZER_DTO_OPTIONS = 'ZOD_SERIALIZER_DTO_OPTIONS';

interface ZodDtoLike {
  schema?: ZodType;
  codec?: unknown;
}

/**
 * Non-throwing response serializer for `@ZodSerializerDto`-annotated handlers.
 *
 * nestjs-zod's stock `ZodSerializerInterceptor` calls `schema.parse(response)`
 * and throws (→ 500) when the response doesn't match the schema. Several
 * existing response schemas are domain/validation schemas reused as response
 * contracts and don't exactly match service output (see AUDIT_FINDINGS F1), so
 * enabling the stock interceptor globally 500s real endpoints.
 *
 * This interceptor instead `safeParse`s:
 * - match  → returns the parsed value, stripping fields not in the contract
 *            (the "no extra fields / reduce traffic" goal).
 * - mismatch → logs a warning with the offending path(s) and passes the
 *              ORIGINAL response through unchanged (no 500, no worse than before).
 *
 * The warnings are the rollout signal: fix each logged schema, and that endpoint
 * starts trimming automatically — no further wiring. Codec DTOs are skipped
 * (they need `.encode`, not `.parse`).
 */
@Injectable()
export class SafeZodSerializerInterceptor implements NestInterceptor {
  private readonly logger = new Logger('SafeZodSerializer');

  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const meta = this.reflector.getAllAndOverride<unknown>(
      ZOD_SERIALIZER_DTO_OPTIONS,
      [context.getHandler(), context.getClass()],
    );
    const schema = this.resolveSchema(meta);

    return next.handle().pipe(
      map((res) => {
        if (!schema || res == null || res instanceof StreamableFile) return res;

        const result = schema.safeParse(res);
        if (result.success) return result.data;

        const req = context.switchToHttp().getRequest<{
          method?: string;
          url?: string;
        }>();
        const issues = result.error.issues
          .slice(0, 5)
          .map((i) => `${i.path.join('.') || '<root>'}: ${i.message}`)
          .join('; ');
        this.logger.warn(
          `Response schema mismatch on ${req?.method ?? '?'} ${
            req?.url ?? '?'
          } — passing original through; fix schema. Issues: ${issues}`,
        );
        return res;
      }),
    );
  }

  private resolveSchema(meta: unknown): ZodType | null {
    if (!meta) return null;

    if (Array.isArray(meta)) {
      const first = meta[0] as ZodDtoLike | ZodType | undefined;
      if (!first) return null;
      if ((first as ZodDtoLike).codec) return null;
      const base = (first as ZodDtoLike).schema ?? (first as ZodType);
      return base && typeof (base as { array?: unknown }).array === 'function'
        ? (base as ZodType & { array: () => ZodType }).array()
        : null;
    }

    const dto = meta as ZodDtoLike;
    if (dto.codec) return null;
    if (dto.schema && typeof dto.schema.safeParse === 'function') {
      return dto.schema;
    }
    if (typeof (meta as ZodType).safeParse === 'function') {
      return meta as ZodType;
    }
    return null;
  }
}
