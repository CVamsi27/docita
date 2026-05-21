import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ClinicTier } from '@workspace/db';
import { PrismaService } from '@/prisma/prisma.service';
import { isFrontDeskWorkspace, parseWorkspaceProfile } from '@workspace/types';
import { isRecord } from '@workspace/utils';
import type { RequestWithUser } from '@/shared/common/types/common.types';

/**
 * Blocks mutating clinical HTTP operations when the clinic workspace is
 * {@link isFrontDeskWorkspace}. GET/HEAD requests are allowed for read-only
 * surfaces (e.g. listing legacy prescriptions).
 */
@Injectable()
export class FrontDeskClinicalBlockGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

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

    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { tier: true, settings: true },
    });
    const settings = isRecord(clinic?.settings) ? clinic.settings : {};

    if (
      clinic?.tier !== ClinicTier.FRONT_DESK &&
      !isFrontDeskWorkspace(parseWorkspaceProfile(settings.workspaceProfile))
    ) {
      return true;
    }

    throw new ForbiddenException(
      'Clinical changes are not available for this workspace profile.',
    );
  }
}
