// jscpd:ignore-start
import {
  Inject,
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '@/prisma/prisma.service';
import { ConsentType } from '@workspace/db';
import { AuthenticatedRequest } from '@workspace/types';
import { isRecord } from '@workspace/utils';

export const REQUIRE_CONSENT_KEY = 'requireConsent';

export const RequirePatientConsent = (...types: ConsentType[]) =>
  SetMetadata(
    REQUIRE_CONSENT_KEY,
    types.length > 0 ? types : [ConsentType.TREATMENT],
  );

/**
 * Opt-in flag on `Clinic.settings`. Treatment-consent gating is OFF by default so
 * legacy / bulk-imported patients (who have no TREATMENT consent row) are never
 * blocked; a clinic turns it on deliberately once it captures consent at intake.
 */
function requireTreatmentConsentEnabled(settings: unknown): boolean {
  if (!isRecord(settings)) return false;
  return settings.requireTreatmentConsent === true;
}

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
    // jscpd:ignore-end

    if (!requiredTypes || requiredTypes.length === 0) return true;

    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest & { params: Record<string, string> }>();
    const patientId = request.params?.patientId;

    if (!patientId) return true;

    // Opt-in: only enforce when the caller's clinic has enabled treatment-consent
    // gating. Default off keeps existing/bulk patients (no consent row) working.
    const clinicId = request.user?.clinicId;
    if (!clinicId) return true;
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { settings: true },
    });
    if (!requireTreatmentConsentEnabled(clinic?.settings)) return true;

    const now = this.clock.now();

    // RLS-BYPASS: guard-phase consent lookup precedes tenant binding (guard
    // runs before TenantContextInterceptor; the tenant extension would 500
    // the tenant-scoped Consent read). The lookup is policy input keyed by
    // the request patientId — ownership is enforced in the handler phase via
    // verifyMedicalHistoryPatientAccess → clinic-scoped getPatient. Same
    // escape hatch as PolicyGuard. One query for all required consent types.
    const activeConsents = await this.prisma.runUnrestricted(async () =>
      this.prisma.consent.findMany({
        where: {
          patientId,
          consentType: { in: requiredTypes },
          status: 'ACTIVE',
          OR: [{ validUntil: null }, { validUntil: { gt: now } }],
        },
        select: { consentType: true },
      }),
    );
    const grantedTypes = new Set(activeConsents.map((c) => c.consentType));
    for (const consentType of requiredTypes) {
      if (!grantedTypes.has(consentType)) {
        throw new ForbiddenException(
          `Patient has not provided required consent: ${consentType}`,
        );
      }
    }

    return true;
  }
}
