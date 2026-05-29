import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { isFrontDeskPlanMode } from '@workspace/types';
import { ClinicAuthCacheService } from '@/shared/modules/auth/auth/clinic-auth-cache.service';
import type { RequestWithUser } from '@/shared/common/types/common.types';

/**
 * Blocks mutating clinical HTTP operations when the clinic is on Front Desk plan mode.
 * GET/HEAD requests are allowed for read-only surfaces (e.g. listing legacy prescriptions).
 */
@Injectable()
export class FrontDeskClinicalBlockGuard implements CanActivate {
  constructor(private readonly clinicAuthCache: ClinicAuthCacheService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithUser>();
    const method = (req.method ?? 'GET').toUpperCase();
    if (method === 'GET' || method === 'HEAD') {
      return true;
    }

    const clinicId = req.user?.clinicId;
    if (!clinicId) {
      return true;
    }

    const auth = await this.clinicAuthCache.getClinicAuth(clinicId);
    if (!isFrontDeskPlanMode(auth.tier, auth.planMode)) {
      return true;
    }

    throw new ForbiddenException(
      'Clinical changes are not available on the Front Desk plan.',
    );
  }
}
