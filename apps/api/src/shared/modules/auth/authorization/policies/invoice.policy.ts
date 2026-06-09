// jscpd:ignore-start
import {
  Injectable,
  Role,
  BaseResourcePolicy,
  type AuthorizationAction,
  type AuthorizationContext,
  type AuthorizationDecision,
  type AuthorizationUser,
} from './policy-shared';

/**
 * Patients only see invoices addressed to them. Clinical staff inherit
 * clinic-wide access after the role+feature gates.
 */
@Injectable()
export class InvoicePolicy extends BaseResourcePolicy {
  protected doCheck(
    _action: AuthorizationAction,
    user: AuthorizationUser,
    context: AuthorizationContext,
  ): AuthorizationDecision {
    if (user.role === Role.PATIENT) {
      const ownerId = context.resourceOwnerId ?? context.assignedPatientId;
      if (!ownerId || ownerId !== user.patientId) {
        return { allowed: false, reason: 'ownership_denied' };
      }
    }

    return { allowed: true };
  }
}
// jscpd:ignore-end
