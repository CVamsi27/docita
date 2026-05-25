import { applyDecorators, UseGuards } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { Role } from '@workspace/db';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { TierGuard } from '@/shared/modules/auth/auth/tier.guard';
import { dpdpBulkAttestationSchema } from '@workspace/types';

export interface ImportsAuthRequest extends ExpressRequest {
  user: {
    id: string;
    clinicId: string;
    role: string;
  };
}

/** Shared tier gate and staff roles for `/imports/*` routes. */
export function ImportsApiAccess() {
  return applyDecorators(
    UseGuards(TierGuard),
    Roles(Role.ADMIN, Role.ADMIN_DOCTOR, Role.INTERNAL),
  );
}

export function assertDpdpAttestation(value: unknown): {
  confirmedByOperator: true;
  noticeVersion: string;
} {
  const parsed = dpdpBulkAttestationSchema.safeParse(value);
  if (!parsed.success) {
    throw new BadRequestException(
      'DPDP consent attestation is required when importing patients',
    );
  }
  return parsed.data;
}
