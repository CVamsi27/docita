import {
  Inject,
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import {
  CLOCK_PORT,
  type IClock,
} from '@/shared/common/ports/clock.port';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '@/prisma/prisma.service';
import { ConsentType } from '@workspace/db';
import { AuthenticatedRequest } from '@workspace/types';

export const REQUIRE_CONSENT_KEY = 'requireConsent';

export const RequirePatientConsent = (...types: ConsentType[]) =>
  SetMetadata(
    REQUIRE_CONSENT_KEY,
    types.length > 0 ? types : [ConsentType.TREATMENT],
  );

@Injectable()
export class ConsentGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredTypes = this.reflector.getAllAndOverride<ConsentType[]>(
      REQUIRE_CONSENT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredTypes || requiredTypes.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest & { params: Record<string, string> }>();
    const patientId = request.params?.patientId;

    if (!patientId) {
      return true;
    }

    const now = this.clock.now();

    for (const consentType of requiredTypes) {
      const consent = await this.prisma.consent.findFirst({
        where: {
          patientId,
          consentType,
          status: 'ACTIVE',
          OR: [{ validUntil: null }, { validUntil: { gt: now } }],
        },
        select: { id: true },
      });

      if (!consent) {
        throw new ForbiddenException(
          `Patient has not provided required consent: ${consentType}`,
        );
      }
    }

    return true;
  }
}
