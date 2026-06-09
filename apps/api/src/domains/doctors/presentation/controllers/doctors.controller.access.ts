import { applyDecorators, UseGuards } from '@nestjs/common';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Role } from '@workspace/db';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { TierGuard } from '@/shared/modules/auth/auth/tier.guard';
import { RequestWithUser } from '@/shared/common/types/common.types';
import { DoctorsService } from '@/domains/doctors/application/services/doctors.service';

/** Shared tier gate and clinic-staff roles for `/doctors/*` routes. */
export function DoctorsApiAccess() {
  return applyDecorators(
    UseGuards(TierGuard),
    Roles(Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST, Role.ADMIN_DOCTOR),
  );
}

export function requireClinicId(req: RequestWithUser): string {
  if (!req.user?.clinicId)
    throw new BadRequestException('Clinic ID is required');
  return req.user.clinicId;
}

export function assertDoctorUpdatesSelf(
  req: RequestWithUser,
  doctorId: string,
  message = 'Doctors can only update their own profile',
): void {
  if (req.user?.role === Role.DOCTOR && req.user.id !== doctorId)
    throw new ForbiddenException(message);
}

export async function assertDoctorInClinic(
  doctorsService: DoctorsService,
  doctorId: string,
  clinicId: string | undefined,
): Promise<void> {
  await doctorsService.findOne(doctorId, clinicId);
}
