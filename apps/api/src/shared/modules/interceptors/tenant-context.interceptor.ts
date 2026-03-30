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
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user) {
      const isSuperAdmin = user.role === 'SUPER_ADMIN';

      if (user.clinicId || isSuperAdmin) {
        const tenantContext = {
          clinicId: user.clinicId,
          userId: user.id || 'system',
          bypassed: isSuperAdmin,
        };

        return from(
          tenantStorage.run(tenantContext, () => lastValueFrom(next.handle())),
        );
      }

      // User is authenticated but has no clinic yet (onboarding flow).
      // Wrap in a bypassed context so runUnrestricted() works correctly.
      return from(
        tenantStorage.run({ bypassed: true, userId: user.id }, () =>
          lastValueFrom(next.handle()),
        ),
      );
    }

    return next.handle();
  }
}
