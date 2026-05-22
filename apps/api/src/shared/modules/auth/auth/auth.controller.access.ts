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
