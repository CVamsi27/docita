import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@workspace/db';
import { ROLES_KEY } from './roles.decorator';

import { bypassesSessionGuards } from './auth-route-metadata.util';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (bypassesSessionGuards(this.reflector, context)) {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const { user } = context.switchToHttp().getRequest();

    if (!requiredRoles) {
      return true;
    }

    if (!user) {
      throw new ForbiddenException(
        'Authentication required to access this resource.',
      );
    }

    const hasRole = requiredRoles.some((role) => user.role === role);
    if (!hasRole) {
      throw new ForbiddenException(
        'Insufficient permissions. You do not have the required role to access this resource.',
      );
    }
    return true;
  }
}
