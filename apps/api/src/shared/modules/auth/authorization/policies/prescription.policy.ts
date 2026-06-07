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
 * Only the prescribing doctor can amend or delete a prescription; ADMIN /
 * ADMIN_DOCTOR retain clinic-wide read for audit. Patients only see their own.
 */
@Injectable()
export class PrescriptionPolicy extends BaseResourcePolicy {
  protected doCheck(
    action: AuthorizationAction,
    user: AuthorizationUser,
    context: AuthorizationContext,
  ): AuthorizationDecision {
    if (user.role === Role.PATIENT) {
      if (
        !context.assignedPatientId ||
        context.assignedPatientId !== user.patientId
      ) {
        return { allowed: false, reason: 'ownership_denied' };
      }
      if (action !== 'read') {
        return { allowed: false, reason: 'role_denied' };
      }
    }

    if (
      user.role === Role.DOCTOR &&
      (action === 'update' || action === 'delete') &&
      context.assignedDoctorId
    ) {
      if (!user.doctorId || user.doctorId !== context.assignedDoctorId) {
        return { allowed: false, reason: 'ownership_denied' };
      }
    }

    return { allowed: true };
  }
}
