import type { Role } from '@workspace/db';
import type {
  AppAccessTarget,
  AccessMode,
  AppPermission,
  Feature,
} from '@workspace/types';

/**
 * Canonical resource identifiers for ABAC policies. Add a new value here and
 * register a corresponding policy in {@link ResourcePolicyRegistry} when a new
 * resource needs ownership-style checks beyond tier+role.
 */
export type AuthorizationResource =
  | 'appointment'
  | 'patient'
  | 'prescription'
  | 'invoice'
  | 'report'
  | 'staff'
  | 'clinic'
  | 'broadcast'
  | 'generic';

export type AuthorizationAction =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'export'
  | 'manage';

export interface AuthorizationUser {
  id: string;
  role: Role;
  clinicId: string | null;
  /** Doctor profile id for users with `Role.DOCTOR` / `Role.ADMIN_DOCTOR`. */
  doctorId?: string | null;
  /** Patient profile id for `Role.PATIENT`. */
  patientId?: string | null;
}

export interface AuthorizationContext {
  /** When passing an access-matrix target, role + feature are derived from it. */
  target?: AppAccessTarget;
  mode?: AccessMode;
  /** Explicit feature override (skips target lookup). */
  feature?: Feature;
  /** Permission code when not using an access-matrix target. */
  permission?: AppPermission;
  /** Ownership context for ABAC dispatch — populated per resource. */
  resourceOwnerId?: string | null;
  resourceClinicId?: string | null;
  assignedDoctorId?: string | null;
  assignedPatientId?: string | null;
  /** Arbitrary extra context for custom policies. */
  meta?: Record<string, unknown>;
}

export type AuthorizationDenyReason =
  | 'no_user'
  | 'no_clinic'
  | 'subscription_inactive'
  | 'subscription_billing_locked'
  | 'feature_not_available'
  | 'feature_locked'
  | 'role_denied'
  | 'permission_denied'
  | 'ownership_denied'
  | 'tenant_mismatch';

export type AuthorizationDecision =
  | { allowed: true }
  | {
      allowed: false;
      reason: AuthorizationDenyReason;
      detail?: Record<string, unknown>;
    };

export interface ResourcePolicy {
  can(
    action: AuthorizationAction,
    user: AuthorizationUser,
    context: AuthorizationContext,
  ): Promise<AuthorizationDecision> | AuthorizationDecision;
}
