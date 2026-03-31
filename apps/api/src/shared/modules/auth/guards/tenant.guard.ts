import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@workspace/db';
import { IS_PUBLIC_KEY } from '@/shared/modules/auth/auth/public.decorator';
import { ALLOW_NO_CLINIC_KEY } from '@/shared/modules/auth/auth/allow-no-clinic.decorator';

const CLINIC_ID_KEYS = new Set(['clinicId']);

function collectClinicIds(
  value: unknown,
  found: Set<string>,
  visited: Set<unknown>,
): void {
  if (!value) return;

  if (typeof value === 'string') {
    if (value.trim().length > 0) found.add(value.trim());
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectClinicIds(item, found, visited);
    }
    return;
  }

  if (typeof value !== 'object') return;
  if (visited.has(value)) return;
  visited.add(value);

  const record = value as Record<string, unknown>;
  for (const [key, entry] of Object.entries(record)) {
    if (CLINIC_ID_KEYS.has(key)) {
      collectClinicIds(entry, found, visited);
      continue;
    }

    if (typeof entry === 'object' && entry !== null) {
      collectClinicIds(entry, found, visited);
    }
  }
}

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType<'http' | 'ws' | 'rpc'>() !== 'http') {
      return true;
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const allowNoClinic = this.reflector.getAllAndOverride<boolean>(
      ALLOW_NO_CLINIC_KEY,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest<{
      user?: { clinicId?: string | null; role?: Role | string };
      params?: Record<string, unknown>;
      query?: Record<string, unknown>;
      body?: Record<string, unknown>;
    }>();
    const user = request.user;

    if (!user) {
      return true;
    }

    if (user.role === Role.SUPER_ADMIN || user.role === 'SUPER_ADMIN') {
      return true;
    }

    if (!user.clinicId) {
      if (allowNoClinic) {
        return true;
      }
      throw new ForbiddenException('User is not associated with a clinic');
    }

    const requestClinicIds = new Set<string>();
    const visited = new Set<unknown>();
    collectClinicIds(request.params, requestClinicIds, visited);
    collectClinicIds(request.query, requestClinicIds, visited);
    collectClinicIds(request.body, requestClinicIds, visited);

    for (const clinicId of requestClinicIds) {
      if (clinicId !== user.clinicId) {
        throw new ForbiddenException(
          'Clinic scope violation: requested clinic does not match your account clinic',
        );
      }
    }

    return true;
  }
}
