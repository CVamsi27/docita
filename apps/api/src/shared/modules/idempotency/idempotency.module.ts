import { Global, Module } from '@nestjs/common';
import { IdempotencyInterceptor } from './idempotency.interceptor';
import { IdempotencyService } from './idempotency.service';

/**
 * Provides the request-level idempotency primitives. The interceptor is
 * intentionally NOT registered as APP_INTERCEPTOR — it is opt-in per
 * controller via @UseInterceptors(IdempotencyInterceptor) +
 * @RequiresIdempotency() so adoption can be incremental and the absence of a
 * key on an unmarked endpoint cannot accidentally change behavior.
 *
 * The module is global so feature modules can resolve the interceptor (and its
 * IdempotencyService dependency) without each domain re-importing this module.
 */
@Global()
@Module({
  providers: [IdempotencyService, IdempotencyInterceptor],
  exports: [IdempotencyService, IdempotencyInterceptor],
})
export class IdempotencyModule {}
