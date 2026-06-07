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
 * PATIENT can only read/update their own record. Clinical staff need
 * same-clinic tenant match. DOCTOR sees any patient in the clinic (no
 * assignment-pinning today; layered above the matrix role gate).
 */
@Injectable()
export class PatientPolicy extends BaseResourcePolicy {
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
