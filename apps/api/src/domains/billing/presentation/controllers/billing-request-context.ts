import { ForbiddenException } from '@nestjs/common';
import type { RequestWithUser } from '@/shared/common/types/common.types';

export interface BillingRequestContext {
  clinicId: string;
  userId: string;
}

export function getBillingRequestContext(
  req: RequestWithUser,
): BillingRequestContext {
  const clinicId = req.user?.clinicId;
  const userId = req.user?.id;

  if (!clinicId || !userId) {
    throw new ForbiddenException('No clinic assigned to this user');
  }

  return { clinicId, userId };
}
