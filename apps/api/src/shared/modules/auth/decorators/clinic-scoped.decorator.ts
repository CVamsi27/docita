import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';
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

@Injectable()
export class ClinicScopedGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.getAllAndOverride<ClinicScopedOptions>(
      CLINIC_SCOPED_KEY,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest();
    const paramName = options?.paramName ?? 'clinicId';

    const clinicId =
      request.user?.clinicId ??
      request.query?.[paramName] ??
      request.body?.[paramName] ??
      request.params?.[paramName];

    if (!clinicId) {
      if (options?.returnEmptyOnMissing) {
        request._clinicScopedEmpty = true;
        return true;
      }
    }

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

      if (!clinicId) {
        return emptyResult;
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}
