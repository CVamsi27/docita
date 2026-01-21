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
    if (user && user.clinicId) {
      return new Observable((subscriber) => {
        // Run the handler within the ALS context
        tenantStorage.run(
          {
            clinicId: user.clinicId,
            userId: user.id || 'system',
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

    // specific to non-authenticated requests or Super Admin (handled differently?)
    // For now, pass through. Middleware will throw if they try to touch detailed data.
    return next.handle();
  }
}
