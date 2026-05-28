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
 * PATIENT can only read/update their own record. Clinical staff need
 * same-clinic tenant match. DOCTOR sees any patient in the clinic (no
 * assignment-pinning today; layered above the matrix role gate).
 */
@Injectable()
export class PatientPolicy implements ResourcePolicy {
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

    if (user.role === Role.PATIENT) {
      const ownerId = context.resourceOwnerId ?? context.assignedPatientId;
      if (!ownerId || ownerId !== user.patientId) {
        return { allowed: false, reason: 'ownership_denied' };
      }
    }

    return { allowed: true };
  }
}
