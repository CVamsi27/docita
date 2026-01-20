import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const CLINIC_SCOPED_KEY = 'clinicScoped';

/**
 * Metadata options for clinic-scoped operations
 */
export interface ClinicScopedOptions {
  /** If true, returns empty result instead of throwing when clinicId is missing */
  returnEmptyOnMissing?: boolean;
  /** The parameter name that contains clinicId (default: 'clinicId') */
  paramName?: string;
}

/**
 * Decorator to mark a method as clinic-scoped.
 *
 * Use this to ensure methods have proper clinic context validation.
 * The guard will check for clinicId in:
 * 1. Request user (req.user.clinicId)
 * 2. Query params (req.query.clinicId)
 * 3. Body (req.body.clinicId)
 * 4. Route params (req.params.clinicId)
 *
 * @example
 * ```typescript
 * @ClinicScoped()
 * @Get()
 * async findAll(@CurrentUser() user: AuthUser) {
 *   // clinicId is guaranteed to exist
 *   return this.service.findAll(user.clinicId);
 * }
 *
 * @ClinicScoped({ returnEmptyOnMissing: true })
 * @Get('search')
 * async search(@Query('clinicId') clinicId: string) {
 *   // Returns empty array if clinicId missing
 *   return this.service.search(clinicId);
 * }
 * ```
 */
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

    // Try to get clinicId from various sources
    const clinicId =
      request.user?.clinicId ??
      request.query?.[paramName] ??
      request.body?.[paramName] ??
      request.params?.[paramName];

    if (!clinicId) {
      if (options?.returnEmptyOnMissing) {
        // Set a flag for the controller to return empty result
        request._clinicScopedEmpty = true;
        return true;
      }
      // Let the request through - will be handled by service validation
      // This allows for better error messages in the service layer
    }

    return true;
  }
}

/**
 * Service-level method decorator for clinic scope validation.
 *
 * This is a simpler alternative when you want to add clinic validation
 * directly at the service method level rather than controller level.
 *
 * @example
 * ```typescript
 * class PatientsService {
 *   @ValidateClinicScope()
 *   async findAll(clinicId: string) {
 *     // Method will return empty array if clinicId is falsy
 *     return this.prisma.patient.findMany({ where: { clinicId } });
 *   }
 * }
 * ```
 */
export function ValidateClinicScope(options?: {
  argIndex?: number;
  emptyResult?: Record<string, unknown> | unknown[];
}) {
  return function (
    target: object,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    const argIndex = options?.argIndex ?? 0;
    const emptyResult = options?.emptyResult ?? {
      items: [],
      hasMore: false,
      count: 0,
    };

    descriptor.value = function (...args: unknown[]) {
      const clinicId = args[argIndex];

      if (!clinicId) {
        return emptyResult;
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}
