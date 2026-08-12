import { Inject, Injectable } from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { PrismaService } from '@/prisma/prisma.service';
import { Consent, ConsentStatus, ConsentType } from '@workspace/db';
import { isRecord } from '@workspace/utils';

function getRequireConsentBeforeSending(value: unknown): boolean | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const consentFlag = value.requireConsentBeforeSending;
  return typeof consentFlag === 'boolean' ? consentFlag : undefined;
}

/**
 * Read-side of the consent surface (CQS split, see
 * docs/audits/BACKEND_FINAL_AUDIT_2026-08-11.md §9.4). All consent
 * queries (has-valid / get-history / validate-whatsapp) live here.
 * Write-side lives in `ConsentCommandService`.
 */
@Injectable()
export class ConsentQueryService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async hasValidConsent(
    patientId: string,
    clinicId: string,
    consentType: ConsentType,
  ): Promise<boolean> {
    const consent = await this.prisma.consent.findFirst({
      where: {
        patientId,
        clinicId,
        consentType,
        status: ConsentStatus.ACTIVE,
        OR: [{ validUntil: null }, { validUntil: { gte: this.clock.now() } }],
      },
    });

    return !!consent;
  }

  async getConsentHistory(
    patientId: string,
    clinicId: string,
  ): Promise<Consent[]> {
    return this.prisma.consent.findMany({
      where: {
        patientId,
        clinicId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async validateWhatsAppConsent(
    patientId: string,
    clinicId: string,
  ): Promise<boolean> {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { whatsappAutomation: true },
    });

    const requireConsentBeforeSending = getRequireConsentBeforeSending(
      clinic?.whatsappAutomation,
    );

    if (!requireConsentBeforeSending) return true;

    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      select: { whatsappConsent: true, whatsappConsentAt: true },
    });

    return patient?.whatsappConsent || false;
  }
}
