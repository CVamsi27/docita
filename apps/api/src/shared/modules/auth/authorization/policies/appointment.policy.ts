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
 * Doctors only see / mutate appointments assigned to them. Other clinical
 * staff (NURSE, RECEPTIONIST, ADMIN, ADMIN_DOCTOR) inherit clinic-wide access
 * after the role+feature gates. Patients see only their own appointments.
 */
@Injectable()
export class AppointmentPolicy extends BaseResourcePolicy {
  protected doCheck(
    _action: AuthorizationAction,
    user: AuthorizationUser,
    context: AuthorizationContext,
  ): AuthorizationDecision {
    if (user.role === Role.DOCTOR && context.assignedDoctorId) {
      if (!user.doctorId || user.doctorId !== context.assignedDoctorId) {
        return { allowed: false, reason: 'ownership_denied' };
      }
    }

    if (user.role === Role.PATIENT && context.assignedPatientId) {
      if (!user.patientId || user.patientId !== context.assignedPatientId) {
        return { allowed: false, reason: 'ownership_denied' };
      }
    }

    return { allowed: true };
  }
}
