import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, from } from 'rxjs';
import { lastValueFrom } from 'rxjs';
import { tenantStorage } from '@/common/middleware/tenant.middleware';

@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
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

        return from(
          tenantStorage.run(tenantContext, () => lastValueFrom(next.handle())),
        );
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
