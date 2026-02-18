import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Logger,
} from '@nestjs/common';
import { Observable, from } from 'rxjs';
import { lastValueFrom } from 'rxjs';
import { tenantStorage } from '../middleware/tenant.middleware';

/**
 * Interceptor that populates the tenant storage from the request user.
 * This ensures that subsequent Prisma queries have access to the clinicId.
 *
 * Uses Promise-based wrapping (lastValueFrom + from) instead of raw Observable
 * subscription to ensure AsyncLocalStorage context propagates correctly through
 * the entire async chain of controller methods and Prisma queries.
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

        // Convert Observable → Promise → run within ALS context → back to Observable
        // This ensures AsyncLocalStorage context propagates through the entire async chain
        return from(
          tenantStorage.run(tenantContext, () => lastValueFrom(next.handle())),
        );
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
