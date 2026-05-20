import { BadRequestException } from '@nestjs/common';
import type { Request } from 'express';

export function requireClinicId(req: Request): string {
  const user = req.user as { clinicId?: string };
  if (!user.clinicId) {
    throw new BadRequestException('User not associated with a clinic');
  }
  return user.clinicId;
}

export function requireClinicActor(req: Request): {
  clinicId: string;
  id: string;
  role: string;
} {
  const user = req.user as { clinicId?: string; id: string; role: string };
  if (!user.clinicId) {
    throw new BadRequestException('User not associated with a clinic');
  }
  return { clinicId: user.clinicId, id: user.id, role: user.role };
}

export function requireUserId(req: Request): string {
  return (req.user as { id: string }).id;
}
