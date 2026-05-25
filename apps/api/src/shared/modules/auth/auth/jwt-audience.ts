import { Role } from '@workspace/db';

/** Staff/clinic app sessions (default for non-patient roles). */
export const JWT_AUDIENCE_STAFF = 'staff' as const;

/** Patient portal OTP login. */
export const JWT_AUDIENCE_PATIENT_PORTAL = 'patient-portal' as const;

/** Short-lived public booking verification tokens. */
export const JWT_AUDIENCE_PUBLIC_BOOKING = 'public-booking' as const;

export const JWT_AUDIENCES = [
  JWT_AUDIENCE_STAFF,
  JWT_AUDIENCE_PATIENT_PORTAL,
  JWT_AUDIENCE_PUBLIC_BOOKING,
] as const;

export type JwtAudience = (typeof JWT_AUDIENCES)[number];

export function jwtAudienceForRole(role: Role | string): JwtAudience {
  if (role === Role.PATIENT || role === 'PATIENT') {
    return JWT_AUDIENCE_PATIENT_PORTAL;
  }
  return JWT_AUDIENCE_STAFF;
}

export function isPatientPortalJwtAudience(
  audience: string | undefined | null,
): boolean {
  return audience === JWT_AUDIENCE_PATIENT_PORTAL;
}
