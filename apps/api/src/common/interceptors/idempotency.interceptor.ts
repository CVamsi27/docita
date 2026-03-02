import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ConflictException,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import {
  IDEMPOTENT_METADATA_KEY,
  IdempotentOptions,
} from '@/shared/modules/auth/decorators/idempotent.decorator';
import { IdempotencyService } from '@/shared/modules/services/idempotency.service';

function toHeaderString(value: unknown): string | undefined {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }

  if (Array.isArray(value) && value.length > 0) {
    const [first] = value;
    return typeof first === 'string' && first.length > 0 ? first : undefined;
  }

  return undefined;
}

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private idempotencyService: IdempotencyService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest();
    const metadata = this.reflector.get<IdempotentOptions>(
      IDEMPOTENT_METADATA_KEY,
      context.getHandler(),
    );

    if (!metadata) {
      return next.handle();
    }

    const headerName = metadata.header || 'x-idempotency-key';
    const idempotencyKey = toHeaderString(request.headers[headerName]);

    if (!idempotencyKey) {
      return next.handle();
    }

    const cachedResponse =
      await this.idempotencyService.getResponse(idempotencyKey);
    if (cachedResponse) {
      return of(cachedResponse);
    }

    const isProcessing =
      await this.idempotencyService.isProcessing(idempotencyKey);
    if (isProcessing) {
      throw new ConflictException(
        'Operation with this idempotency key is already in progress',
      );
    }

    await this.idempotencyService.setProcessing(idempotencyKey);

    return next.handle().pipe(
      tap({
        next: (response) => {
          void this.idempotencyService.saveResponse(
            idempotencyKey,
            response,
            metadata.ttl,
          );
          void this.idempotencyService.clearProcessing(idempotencyKey);
        },
        error: () => {
          void this.idempotencyService.clearProcessing(idempotencyKey);
        },
      }),
    );
  }
}
