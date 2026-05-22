import { JwtService } from '@nestjs/jwt';
import { Role } from '@workspace/db';
import { jwtAudienceForRole } from '@/shared/modules/auth/auth/jwt-audience';

export type E2eAccessTokenPayload = {
  sub: string;
  email: string;
  role: Role;
  name: string;
  clinicId: string | null;
  patientId?: string;
};

/** Signs a JWT the same way production login does (includes staff/patient audience). */
export function signE2eAccessToken(
  jwtService: JwtService,
  payload: E2eAccessTokenPayload,
): string {
  return jwtService.sign(
    {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      name: payload.name,
      clinicId: payload.clinicId,
      ...(payload.patientId ? { patientId: payload.patientId } : {}),
    },
    { audience: jwtAudienceForRole(payload.role) },
  );
}
