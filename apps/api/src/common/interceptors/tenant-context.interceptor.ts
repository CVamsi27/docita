import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tenantStorage } from '../middleware/tenant.middleware';

/**
 * Interceptor that populates the tenant storage from the request user.
 * This ensures that subsequent Prisma queries have access to the clinicId.
 *
 * The key insight is that we need the subscription to happen INSIDE the
 * tenantStorage.run() context, not outside of it. We achieve this by
 * returning the entire observable chain wrapped in the context.
 */
@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TenantContextInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // specific to HTTP requests with authenticated user
    if (user) {
      const isSuperAdmin = user.role === 'SUPER_ADMIN';
      if (user.clinicId || isSuperAdmin) {
        const tenantContext = {
          clinicId: user.clinicId,
          userId: user.id || 'system',
          bypassed: isSuperAdmin,
        };

        this.logger.debug(
          `TENANT CONTEXT [${request.method} ${request.url}]: clinicId=${user.clinicId || 'GLOBAL'}, userId=${user.id || 'system'}, bypassed=${isSuperAdmin}`,
        );

        // Return a new observable that will run the entire chain within tenant context
        // The key here is that we create the subscription WITHIN tenantStorage.run()
        return new Observable((subscriber) => {
          tenantStorage.run(tenantContext, () => {
            // NOW we get the next handler and subscribe - all within the context
            const subscription = next.handle().subscribe({
              next: (value) => subscriber.next(value),
              error: (err) => subscriber.error(err),
              complete: () => subscriber.complete(),
            });
            
            // Return cleanup function
            return () => subscription.unsubscribe();
          });
        });
      }
    }

    // specific to non-authenticated requests or if clinicId is missing
    if (user && !user.clinicId) {
      this.logger.debug(
        `[DEBUG] User found but clinicId missing: ${JSON.stringify(user)}`,
      );
    }
    return next.handle();
  }
}
