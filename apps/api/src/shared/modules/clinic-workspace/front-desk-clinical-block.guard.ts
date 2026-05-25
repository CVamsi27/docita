import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { isFrontDeskTier } from '@workspace/types';
import { PrismaService } from '@/prisma/prisma.service';
import type { RequestWithUser } from '@/shared/common/types/common.types';

/**
 * Blocks mutating clinical HTTP operations on the Front Desk tier.
 * GET/HEAD requests are allowed for read-only surfaces (e.g. listing legacy prescriptions).
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
      select: { tier: true },
    });

    if (!isFrontDeskTier(clinic?.tier)) {
      return true;
    }

    throw new ForbiddenException(
      'Clinical changes are not available on the Front Desk plan.',
    );
  }
}
