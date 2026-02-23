import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { AuditService } from '../../modules/audit/audit.service';
import { tenantStorage } from '../middleware/tenant.middleware';
import { EMERGENCY_ACCESS_KEY } from '../../shared/modules/auth/decorators/emergency-access.decorator';

@Injectable()
export class BreakTheGlassInterceptor implements NestInterceptor {
  private readonly logger = new Logger(BreakTheGlassInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const isBTG = request.headers['x-break-the-glass'] === 'true';
    const reason = request.headers['x-btg-reason'] || 'No reason provided';

    if (!isBTG) {
      return next.handle();
    }

    const isEligible = this.reflector.get<boolean>(
      EMERGENCY_ACCESS_KEY,
      context.getHandler(),
    );

    if (!isEligible) {
      this.logger.warn(
        `User ${request.user?.id} attempted Break-the-Glass on non-eligible endpoint: ${request.url}`,
      );
      throw new ForbiddenException(
        'This endpoint is not eligible for emergency Break-the-Glass access.',
      );
    }

    const { user, ip, method, url } = request;

    // Log the emergency access attempt IMMEDIATELY
    await this.auditService.logAction(
      {
        userId: user?.id,
        clinicId: user?.clinicId,
        actionType: 'EMERGENCY_ACCESS_GRANTED',
        resourceType: 'SYSTEM',
        resourceId: 'BREAK_THE_GLASS',
        ipAddress: ip || request.connection.remoteAddress,
        metadata: {
          method,
          url,
          reason,
          timestamp: new Date().toISOString(),
        },
      },
      true, // immediate logging for security
    );

    this.logger.error(
      `!!! EMERGENCY ACCESS (BTG) GRANTED !!! User: ${user?.id} | Reason: ${reason} | Endpoint: ${method} ${url}`,
    );

    // Bypass tenant isolation for the duration of this request
    return tenantStorage.run({ ...user, bypassed: true }, () => next.handle());
  }
}
