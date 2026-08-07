import { applyDecorators, UseGuards } from '@nestjs/common';
import { Role } from '@workspace/db';
import { Roles } from './roles.decorator';
import { AllowNoClinic } from './allow-no-clinic.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';
import { SkipSubscriptionCheck } from '@/shared/modules/auth/decorators/skip-subscription-check.decorator';
import { SkipPasswordExpiry } from '@/shared/modules/auth/guards/password-expired.guard';
import { SkipEmailVerification } from '@/shared/modules/auth/guards/email-verified.guard';

const AUTHENTICATED_CLINIC_ROLES = [
  Role.ADMIN,
  Role.DOCTOR,
  Role.NURSE,
  Role.RECEPTIONIST,
  Role.ADMIN_DOCTOR,
  Role.INTERNAL,
  Role.PATIENT,
] as const;

/**
 * C7 (ADR-0013): the effective-permissions snapshot is read-only metadata
 * for the staff app + INTERNAL console. Portal roles (PATIENT) are excluded —
 * the matrix targets are staff/console surfaces. No TierGuard/RequireFeature:
 * the payload mirrors whatever the client matrix would evaluate, including
 * tier-blocked targets (false), so gating the endpoint itself would hide the
 * denial information the UI needs. The global subscription guard still
 * applies (billing-locked clinics get the standard 403).
 */
const EFFECTIVE_PERMISSIONS_ROLES = [
  Role.DOCTOR,
  Role.NURSE,
  Role.RECEPTIONIST,
  Role.ADMIN,
  Role.ADMIN_DOCTOR,
  Role.INTERNAL,
] as const;

export function EffectivePermissionsApiAccess() {
  return applyDecorators(Roles(...EFFECTIVE_PERMISSIONS_ROLES));
}

/** JWT session routes that skip subscription/password/email gates. */
export function AuthSessionAccess() {
  return applyDecorators(
    UseGuards(JwtAuthGuard),
    AllowNoClinic(),
    SkipSubscriptionCheck(),
    SkipPasswordExpiry(),
    SkipEmailVerification(),
    Roles(...AUTHENTICATED_CLINIC_ROLES),
  );
}
