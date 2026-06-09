import { Injectable } from '@nestjs/common';
import type {
  AuthorizationAction,
  AuthorizationContext,
  AuthorizationDecision,
  AuthorizationUser,
} from '../types';
import { BaseResourcePolicy } from './base-policy';

/**
 * Fallback policy for resources without bespoke ownership logic. Enforces the
 * baseline tenant invariant: the resource (if it carries a `clinicId`) must
 * belong to the user's clinic.
 */
@Injectable()
export class GenericTenantPolicy extends BaseResourcePolicy {
  protected doCheck(
    _action: AuthorizationAction,
    _user: AuthorizationUser,
    _context: AuthorizationContext,
  ): AuthorizationDecision {
    return { allowed: true };
  }
}
