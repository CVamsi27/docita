import { BadRequestException } from '@nestjs/common';

type ClinicAuthUser = {
  id?: string;
  clinicId?: string | null;
  role?: string;
};

type ClinicAuthRequest = {
  user?: ClinicAuthUser;
};

export function requireClinicId(req: ClinicAuthRequest): string {
  const clinicId = req.user?.clinicId;
  if (!clinicId) {
    throw new BadRequestException('User not associated with a clinic');
  }
  return clinicId;
}

export function requireClinicActor(req: ClinicAuthRequest): {
  clinicId: string;
  id: string;
  role: string;
} {
  const user = req.user;
  if (!user?.clinicId || !user.id || !user.role) {
    throw new BadRequestException('User not associated with a clinic');
  }
  return { clinicId: user.clinicId, id: user.id, role: user.role };
}

export function requireUserId(req: ClinicAuthRequest): string {
  const userId = req.user?.id;
  if (!userId) {
    throw new BadRequestException('Authenticated user is required');
  }
  return userId;
}
