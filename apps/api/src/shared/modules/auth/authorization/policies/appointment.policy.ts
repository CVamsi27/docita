import { Injectable } from '@nestjs/common';
import { Role } from '@workspace/db';
import type {
  AuthorizationAction,
  AuthorizationContext,
  AuthorizationDecision,
  AuthorizationUser,
  ResourcePolicy,
} from '../types';

/**
 * Doctors only see / mutate appointments assigned to them. Other clinical
 * staff (NURSE, RECEPTIONIST, ADMIN, ADMIN_DOCTOR) inherit clinic-wide access
 * after the role+feature gates. Patients see only their own appointments.
 */
@Injectable()
export class AppointmentPolicy implements ResourcePolicy {
  can(
    _action: AuthorizationAction,
    user: AuthorizationUser,
    context: AuthorizationContext,
  ): AuthorizationDecision {
    if (
      context.resourceClinicId &&
      user.clinicId &&
      context.resourceClinicId !== user.clinicId
    ) {
      return { allowed: false, reason: 'tenant_mismatch' };
    }

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
