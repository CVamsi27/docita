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
