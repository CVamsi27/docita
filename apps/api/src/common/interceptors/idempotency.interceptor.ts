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
} from '../../shared/modules/auth/decorators/idempotent.decorator';
import { IdempotencyService } from '../services/idempotency.service';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private idempotencyService: IdempotencyService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const metadata = this.reflector.get<IdempotentOptions>(
      IDEMPOTENT_METADATA_KEY,
      context.getHandler(),
    );

    if (!metadata) {
      return next.handle();
    }

    const headerName = metadata.header || 'x-idempotency-key';
    const idempotencyKey = request.headers[headerName];

    if (!idempotencyKey) {
      return next.handle();
    }

    // 1. Check if already processed
    const cachedResponse =
      await this.idempotencyService.getResponse(idempotencyKey);
    if (cachedResponse) {
      return of(cachedResponse);
    }

    // 2. Check if currently processing (prevent concurrent same-key requests)
    const isProcessing =
      await this.idempotencyService.isProcessing(idempotencyKey);
    if (isProcessing) {
      throw new ConflictException(
        'Operation with this idempotency key is already in progress',
      );
    }

    // 3. Set processing lock
    await this.idempotencyService.setProcessing(idempotencyKey);

    return next.handle().pipe(
      tap({
        next: (response) => {
          // Success: save response and clear lock
          void this.idempotencyService.saveResponse(
            idempotencyKey as string,
            response,
            metadata.ttl,
          );
          void this.idempotencyService.clearProcessing(
            idempotencyKey as string,
          );
        },
        error: () => {
          // Error: just clear lock so it can be retried
          void this.idempotencyService.clearProcessing(
            idempotencyKey as string,
          );
        },
      }),
    );
  }
}
