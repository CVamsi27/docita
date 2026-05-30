import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { forbiddenProblem } from '@/shared/common/errors/forbidden-problem';
import { Reflector } from '@nestjs/core';
import { PATIENT_PORTAL_SESSION_KEY } from '@/shared/modules/auth/auth/patient-portal-session.decorator';
import { isPatientPortalJwtAudience } from '@/shared/modules/auth/auth/jwt-audience';
import { bypassesSessionGuards } from '@/shared/modules/auth/auth/auth-route-metadata.util';

/**
 * Rejects patient-portal JWTs on staff API routes unless the handler is marked
 * {@link PatientPortalSession}.
 */
@Injectable()
export class StaffJwtAudienceGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (bypassesSessionGuards(this.reflector, context)) {
      return true;
    }

    const allowsPatientPortal = this.reflector.getAllAndOverride<boolean>(
      PATIENT_PORTAL_SESSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (allowsPatientPortal) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      user?: { jwtAudience?: string };
    }>();
    const audience = request.user?.jwtAudience;

    if (isPatientPortalJwtAudience(audience)) {
      throw forbiddenProblem(
        'INSUFFICIENT_PERMISSIONS',
        'Patient portal sessions cannot access staff API routes.',
      );
    }

    return true;
  }
}
