import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { IdempotencyInterceptor } from './idempotency.interceptor';
import { IdempotencyRepository } from './idempotency.repository';
import { IdempotencyService } from './idempotency.service';

/**
 * Provides the request-level idempotency primitives. The interceptor is
 * registered globally in AppModule, but behavior remains opt-in per handler via
 * @RequiresIdempotency() metadata. Unmarked endpoints are unaffected.
 *
 * The module is global so feature modules can resolve the interceptor (and its
 * IdempotencyService dependency) without each domain re-importing this module.
 */
@Global()
@Module({
  imports: [PrismaModule],
  providers: [
    IdempotencyRepository,
    IdempotencyService,
    IdempotencyInterceptor,
  ],
  exports: [IdempotencyService, IdempotencyInterceptor],
})
export class IdempotencyModule {}
