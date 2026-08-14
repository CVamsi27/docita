import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { forbiddenProblem } from '@/shared/common/errors/forbidden-problem';
import { Reflector } from '@nestjs/core';
import { Role } from '@workspace/db';
import { ROLES_KEY } from './roles.decorator';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';

import { bypassesSessionGuards } from './auth-route-metadata.util';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private configService: AppConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    if (bypassesSessionGuards(this.reflector, context)) {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const { user } = context.switchToHttp().getRequest();

    if (!requiredRoles) return true;

    if (!user)
      throw forbiddenProblem(
        'AUTHENTICATION_REQUIRED',
        'Authentication required to access this resource.',
      );

    const hasRole = requiredRoles.some((role) => user.role === role);
    if (!hasRole)
      throw forbiddenProblem(
        'INSUFFICIENT_PERMISSIONS',
        'Insufficient permissions. You do not have the required role to access this resource.',
      );

    // Enforce email allowlist for INTERNAL role: even if a user record has
    // Role.INTERNAL in the DB, only configured operator emails may use it.
    if (user.role === Role.INTERNAL) {
      const allowedEmails = this.configService.getInternalAllowedEmails();
      if (allowedEmails.length > 0) {
        const userEmail =
          typeof user.email === 'string' ? user.email.toLowerCase() : '';
        if (!userEmail || !allowedEmails.includes(userEmail)) {
          throw forbiddenProblem(
            'INSUFFICIENT_PERMISSIONS',
            'Internal access is restricted to the Docita operator team.',
          );
        }
      }
    }

    return true;
  }
}
