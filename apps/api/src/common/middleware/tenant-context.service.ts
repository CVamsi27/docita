import { Injectable, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Inject } from '@nestjs/common';
import { Request } from 'express';

/**
 * User info from JWT token
 */
interface AuthUser {
  id: string;
  email: string;
  role: string;
  clinicId: string;
}

/**
 * Request with authenticated user
 */
interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

/**
 * Request-scoped tenant context service.
 *
 * Provides access to the current tenant (clinicId) from anywhere
 * in the request lifecycle. This is used by the tenant middleware
 * and can be injected into services that need tenant context.
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class SomeService {
 *   constructor(private tenantContext: TenantContextService) {}
 *
 *   async someMethod() {
 *     const clinicId = this.tenantContext.getClinicId();
 *     // Use clinicId in queries
 *   }
 * }
 * ```
 */
@Injectable({ scope: Scope.REQUEST })
export class TenantContextService {
  constructor(
    @Inject(REQUEST) private readonly request: AuthenticatedRequest,
  ) {}

  /**
   * Get the current tenant's clinic ID
   * Returns undefined if no user is authenticated
   */
  getClinicId(): string | undefined {
    return this.request.user?.clinicId;
  }

  /**
   * Get the current tenant's clinic ID or throw if not available
   */
  getClinicIdOrFail(): string {
    const clinicId = this.getClinicId();
    if (!clinicId) {
      throw new Error('No tenant context available');
    }
    return clinicId;
  }

  /**
   * Get the current user's ID
   */
  getUserId(): string | undefined {
    return this.request.user?.id;
  }

  /**
   * Get the current user's role
   */
  getUserRole(): string | undefined {
    return this.request.user?.role;
  }

  /**
   * Get the full user object
   */
  getUser(): AuthUser | undefined {
    return this.request.user;
  }
}
