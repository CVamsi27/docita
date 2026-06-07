import { BadRequestException } from '@nestjs/common';

type ClinicAuthRequest = {
  user?: { id?: string; clinicId?: string | null; role?: string };
};

export function requireClinicId(req: ClinicAuthRequest): string {
  const clinicId = req.user?.clinicId;
  if (!clinicId)
    throw new BadRequestException('User not associated with a clinic');
  return clinicId;
}
