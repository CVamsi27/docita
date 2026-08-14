import { Injectable } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { ResourceAttributes } from '@workspace/types';
import type { PolicyResourceResolver } from './policy-resource-resolver.interface';

/**
 * Resolves an `audit-log` resource for the list-only audit routes. These
 * routes carry no `:id` — the resource is the requester's own clinic's log
 * collection (the controller forces `filter.clinicId` to the requester's
 * clinic for every non-INTERNAL). Resolving from the authenticated user keeps
 * tenant discipline structural: cross-clinic targeting is impossible by
 * construction on these routes, and the discipline pins the no-existence-
 * disclosure invariant for any future `:id` route. INTERNAL has no clinicId —
 * the placeholder is never compared (the policy's INTERNAL branch bypasses
 * tenant discipline).
 */
@Injectable()
export class AuditLogResourceResolver implements PolicyResourceResolver {
  readonly resource = 'audit-log';

  async resolve(context: ExecutionContext): Promise<ResourceAttributes> {
    const request = context
      .switchToHttp()
      .getRequest<{ user?: { clinicId?: string } }>();
    return {
      type: 'audit-log',
      clinicId: request.user?.clinicId ?? 'internal',
      ownerId: null,
      assignedDoctorIds: [],
      assignedPatientId: null,
      classification: 'phi',
      consentState: null,
      status: null,
      requiresAssignment: false,
    };
  }
}
