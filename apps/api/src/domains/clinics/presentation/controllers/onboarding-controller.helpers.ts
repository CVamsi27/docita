import { ForbiddenException } from '@nestjs/common';
import type { RequestWithUser } from '@/shared/common/types/common.types';

export function assertNoExistingClinicOnboarding(
  req: RequestWithUser | undefined,
  action: string,
): void {
  if (
    req?.user &&
    (req.user.clinicId || req.user.onboardingStep === 'COMPLETED')
  ) {
    throw new ForbiddenException(`${action} not allowed for existing clinics`);
  }
}
