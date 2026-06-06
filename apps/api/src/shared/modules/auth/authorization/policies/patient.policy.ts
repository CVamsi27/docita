import { Injectable } from '@nestjs/common';
import { Role } from '@workspace/db';
import type {
  AuthorizationAction,
  AuthorizationContext,
  AuthorizationDecision,
  AuthorizationUser,
} from '../types';
import { BaseResourcePolicy } from './base-policy';

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
