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
