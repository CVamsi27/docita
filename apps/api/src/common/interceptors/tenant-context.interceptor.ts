import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tenantStorage } from '../middleware/tenant.middleware';

/**
 * Interceptor that populates the tenant storage from the request user.
 * This ensures that subsequent Prisma queries have access to the clinicId.
 */
@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // specific to HTTP requests with authenticated user
    if (user) {
      const isSuperAdmin = user.role === 'SUPER_ADMIN';
      if (user.clinicId || isSuperAdmin) {
        return new Observable((subscriber) => {
          // Run the handler within the ALS context
          console.log(
            `TENANT CONTEXT [${request.method} ${request.url}]: clinicId=${user.clinicId || 'GLOBAL'}, userId=${user.id || 'system'}, bypassed=${isSuperAdmin}`,
          );
          tenantStorage.run(
            {
              clinicId: user.clinicId,
              userId: user.id || 'system',
              bypassed: isSuperAdmin,
            },
            () => {
              next.handle().subscribe({
                next: (res) => subscriber.next(res),
                error: (err) => subscriber.error(err),
                complete: () => subscriber.complete(),
              });
            },
          );
        });
      }
    }

    // specific to non-authenticated requests or if clinicId is missing
    if (user && !user.clinicId) {
      console.log(
        `[DEBUG] User found but clinicId missing: ${JSON.stringify(user)}`,
      );
    }
    return next.handle();
  }
}
