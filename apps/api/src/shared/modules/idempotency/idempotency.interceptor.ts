import {
  BadRequestException,
  CallHandler,
  ConflictException,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import {
  IDEMPOTENCY_HEADER,
  IDEMPOTENCY_METADATA_KEY,
  UUID_V4_REGEX,
} from './idempotency.constants';
import { RequiresIdempotencyMetadata } from './requires-idempotency.decorator';
import { IdempotencyService } from './idempotency.service';

interface ScopedRequest {
  user?: { id?: string; userId?: string; clinicId?: string };
  tenantId?: string;
  clinicId?: string;
  body?: unknown;
  method: string;
  originalUrl?: string;
  url?: string;
  path?: string;
  headers: Record<string, unknown>;
}

function readHeader(value: unknown): string | null {
  if (typeof value === 'string' && value.length > 0) return value;
  if (Array.isArray(value) && typeof value[0] === 'string' && value[0]) {
    return value[0];
  }
  return null;
}

/**
 * Canonical route path for idempotency scoping. Prefer the raw URL path
 * (without query) so concurrent requests on the same route always share the
 * same scoped key; `req.path` can differ across Express/Nest versions or mounts.
 */
function readPath(req: ScopedRequest): string {
  const fromUrl = (req.originalUrl ?? req.url ?? '').split('?')[0];
  if (fromUrl.length > 0) {
    return fromUrl.startsWith('/') ? fromUrl : `/${fromUrl}`;
  }
  const p = req.path ?? '';
  return p.startsWith('/') ? p : `/${p}`;
}

function readUserId(req: ScopedRequest): string | null {
  return req.user?.id ?? req.user?.userId ?? null;
}

function readTenantId(req: ScopedRequest): string | null {
  return req.tenantId ?? req.user?.clinicId ?? req.clinicId ?? null;
}

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly service: IdempotencyService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const metadata = this.reflector.get<RequiresIdempotencyMetadata>(
      IDEMPOTENCY_METADATA_KEY,
      context.getHandler(),
    );

    if (!metadata) return next.handle();

    const request = context.switchToHttp().getRequest<ScopedRequest>();
    const rawKey = readHeader(
      request.headers[IDEMPOTENCY_HEADER] ??
        request.headers[`x-${IDEMPOTENCY_HEADER}`],
    );

    if (!rawKey) return next.handle();

    if (!UUID_V4_REGEX.test(rawKey)) {
      throw new BadRequestException(
        'Idempotency-Key must be a UUID v4 in canonical form.',
      );
    }

    const tenantId = readTenantId(request);
    const userId = readUserId(request);

    if (!tenantId || !userId) {
      throw new BadRequestException(
        'Idempotency-Key requires an authenticated request with a tenant scope.',
      );
    }

    const scopedKey = this.service.buildKey({
      tenantId,
      userId,
      method: request.method,
      path: readPath(request),
      key: rawKey,
    });

    const bodyHash = this.service.hashBody(request.body);

    const cached = await this.service.getCached(scopedKey);
    if (cached) {
      if (cached.bodyHash !== bodyHash) {
        throw new UnprocessableEntityException(
          'Idempotency-Key was previously used with a different request body. ' +
            'Either reuse the original body or generate a new key.',
        );
      }
      return of(cached.response);
    }

    try {
      await this.service.markProcessing(scopedKey);
    } catch (err) {
      if (err instanceof ConflictException) {
        const replay = await this.service.getCached(scopedKey);
        if (replay && replay.bodyHash === bodyHash) {
          return of(replay.response);
        }
      }
      throw err;
    }

    return new Observable((subscriber) => {
      next
        .handle()
        .pipe(
          tap({
            next: async (response) => {
              try {
                await this.service.saveCached(
                  scopedKey,
                  {
                    bodyHash,
                    response,
                    createdAt: Date.now(),
                  },
                  metadata.ttl,
                );
              } finally {
                await this.service.clearProcessing(scopedKey);
              }
            },
            error: async () => {
              await this.service.clearProcessing(scopedKey);
            },
          }),
        )
        .subscribe({
          next: (value) => subscriber.next(value),
          error: (err) => subscriber.error(coerceError(err)),
          complete: () => subscriber.complete(),
        });
    });
  }
}

function coerceError(err: unknown): unknown {
  if (err instanceof HttpException) return err;
  return err;
}
