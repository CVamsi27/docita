import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, from } from 'rxjs';
import { lastValueFrom } from 'rxjs';
import { tenantStorage } from '@/shared/common/middleware/tenant.middleware';
import { PrismaService } from '@/prisma/prisma.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { applyRlsScope } from '@/shared/modules/rls/apply-rls-scope';
import { runWithActiveTx } from '@/shared/modules/rls/active-tx.storage';
import { getRlsRequestTransactionOptions } from '@/shared/common/database-transaction-options';

@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  intercept<TResponse>(
    context: ExecutionContext,
    next: CallHandler<TResponse>,
  ): Observable<TResponse> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user) {
      const isInternal = user.role === 'INTERNAL';

      if (user.clinicId || isInternal) {
        const tenantContext = {
          clinicId: user.clinicId,
          userId: user.id || 'system',
          bypassed: isInternal,
        };

        const runHandler = () =>
          tenantStorage.run(tenantContext, () => lastValueFrom(next.handle()));

        const clinicId = tenantContext.clinicId;
        if (this.config.isRlsEnabled() && clinicId && !tenantContext.bypassed) {
          // Open a single interactive transaction for the whole request,
          // set the tenant-scope GUC on it, and publish that `tx` into
          // `activeTxStorage`. The `rls-routing` Prisma extension then
          // forwards every Prisma model operation through `tx` so the
          // GUC actually governs the queries — without this, `SET LOCAL`
          // would only apply to `tx`'s pinned connection while the rest
          // of the request used a different pool connection.
          return from(
            this.prisma.$transaction(
              async (tx) => {
                await applyRlsScope(tx, clinicId);
                return runWithActiveTx(tx, runHandler);
              },
              getRlsRequestTransactionOptions(),
            ),
          );
        }

        return from(runHandler());
      }

      return from(
        tenantStorage.run({ preTenant: true, userId: user.id }, () =>
          lastValueFrom(next.handle()),
        ),
      );
    }

    return next.handle();
  }
}
