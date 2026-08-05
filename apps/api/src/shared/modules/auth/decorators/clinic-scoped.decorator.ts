// check-as-cast-density: allow-file — untyped Express request properties (user/query/body/params) are read off a Record<string, unknown> request and narrowed to the clinic-scope fields; the historical Reflect.defineMetadata cast is gone (P5.2i)
import {
  BadRequestException,
  SetMetadata,
  UseGuards,
  applyDecorators,
} from '@nestjs/common';
import { forbiddenProblem } from '@/shared/common/errors/forbidden-problem';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const CLINIC_SCOPED_KEY = 'clinicScoped';

export interface ClinicScopedOptions {
  returnEmptyOnMissing?: boolean;

  paramName?: string;
}

export function ClinicScoped(options?: ClinicScopedOptions) {
  return applyDecorators(
    SetMetadata(CLINIC_SCOPED_KEY, options ?? {}),
    UseGuards(ClinicScopedGuard),
  );
}

function readString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function resolveClinicId(
  request: Record<string, unknown>,
  paramName: string,
): { userClinicId: string | undefined; requestedClinicId: string | undefined } {
  const user = request.user as Record<string, unknown> | undefined;
  const query = request.query as Record<string, unknown> | undefined;
  const body = request.body as Record<string, unknown> | undefined;
  const params = request.params as Record<string, unknown> | undefined;
  return {
    userClinicId: readString(user?.clinicId),
    requestedClinicId:
      readString(query?.[paramName]) ??
      readString(body?.[paramName]) ??
      readString(params?.[paramName]),
  };
}

@Injectable()
export class ClinicScopedGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.getAllAndOverride<ClinicScopedOptions>(
      CLINIC_SCOPED_KEY,
      [context.getHandler(), context.getClass()],
    );

    const request = context
      .switchToHttp()
      .getRequest<Record<string, unknown>>();
    const { userClinicId, requestedClinicId } = resolveClinicId(
      request,
      options?.paramName ?? 'clinicId',
    );
    const clinicId = userClinicId ?? requestedClinicId;

    if (!clinicId) {
      if (options?.returnEmptyOnMissing) {
        request._clinicScopedEmpty = true;
        return true;
      }
      throw new BadRequestException('Clinic scope is required');
    }

    if (userClinicId && requestedClinicId && userClinicId !== requestedClinicId)
      throw forbiddenProblem('CLINIC_SCOPE_MISMATCH', 'Clinic scope mismatch');

    return true;
  }
}

export function ValidateClinicScope(options?: {
  argIndex?: number;
  emptyResult?: Record<string, unknown> | unknown[];
}) {
  return function (
    _target: object,
    _propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    const argIndex = options?.argIndex ?? 0;
    const emptyResult = options?.emptyResult ?? {
      items: [],
      hasMore: false,
      count: 0,
    };

    descriptor.value = function (
      ...args: Array<string | number | Record<string, unknown>>
    ) {
      const clinicId = args[argIndex];

      if (!clinicId) return emptyResult;

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}
