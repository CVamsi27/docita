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
 * Only the prescribing doctor can amend or delete a prescription; ADMIN /
 * ADMIN_DOCTOR retain clinic-wide read for audit. Patients only see their own.
 */
@Injectable()
export class PrescriptionPolicy implements ResourcePolicy {
  can(
    action: AuthorizationAction,
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
