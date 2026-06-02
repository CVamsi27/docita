import { Injectable, Inject } from '@nestjs/common';
import {
  CLINIC_PERSISTENCE_PORT,
  type ClinicPersistencePort,
} from '@/domains/clinics/application/ports/clinic-persistence.port';
import {
  DataSubjectRequestStatus,
  DataSubjectRequestType,
} from '@workspace/db';
import type { AppComplianceSummary } from '@workspace/types';

@Injectable()
export class ClinicSettingsQueryService {
  constructor(
    @Inject(CLINIC_PERSISTENCE_PORT)
    private persistence: ClinicPersistencePort,
  ) {}

  private toRecord(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object') {
      return {};
    }
    return Object.fromEntries(Object.entries(value));
  }

  private readString(
    source: Record<string, unknown>,
    key: string,
    fallback: string,
  ): string {
    const value = source[key];
    return typeof value === 'string' ? value : fallback;
  }

  private readBoolean(
    source: Record<string, unknown>,
    key: string,
    fallback: boolean,
  ): boolean {
    const value = source[key];
    return typeof value === 'boolean' ? value : fallback;
  }

  private readNumber(
    source: Record<string, unknown>,
    key: string,
    fallback: number,
  ): number {
    const value = source[key];
    return typeof value === 'number' && Number.isFinite(value)
      ? value
      : fallback;
  }

  async getComplianceSummary(clinicId: string): Promise<AppComplianceSummary> {
    const openRequestStatuses = [
      DataSubjectRequestStatus.OPEN,
      DataSubjectRequestStatus.IN_REVIEW,
    ];
    const [clinic, activeTemplate, requestCounts] = await Promise.all([
      this.persistence.clinic.findUnique({
        where: { id: clinicId },
        select: {
          slaSignatureUrl: true,
          slaSignatureAcceptedAt: true,
        },
      }),
      this.persistence.consentTemplate.findFirst({
        where: {
          OR: [{ clinicId }, { clinicId: null }],
          isActive: true,
        },
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true },
      }),
      this.persistence.dataSubjectRequest.groupBy({
        by: ['requestType'],
        where: {
          clinicId,
          status: { in: openRequestStatuses },
        },
        _count: { _all: true },
      }),
    ]);
    const countByType = new Map(
      requestCounts.map((item) => [item.requestType, item._count._all]),
    );

    return {
      slaSignatureUrl: clinic?.slaSignatureUrl ?? null,
      slaSignatureAcceptedAt:
        clinic?.slaSignatureAcceptedAt?.toISOString() ?? null,
      consentTemplateEnabled: Boolean(activeTemplate),
      consentTemplateUpdatedAt: activeTemplate?.updatedAt.toISOString() ?? null,
      withdrawalRequestsOpen:
        countByType.get(DataSubjectRequestType.CONSENT_WITHDRAWAL) ?? 0,
      dataExportRequestsOpen:
        (countByType.get(DataSubjectRequestType.ACCESS) ?? 0) +
        (countByType.get(DataSubjectRequestType.EXPORT) ?? 0),
      dataDeletionRequestsOpen:
        countByType.get(DataSubjectRequestType.DELETION) ?? 0,
    };
  }

  listDataSubjectRequests(clinicId: string, status?: DataSubjectRequestStatus) {
    return this.persistence.dataSubjectRequest.findMany({
      where: {
        clinicId,
        ...(status ? { status } : {}),
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: 100,
    });
  }

  async getPrescriptionDefaults(clinicId: string) {
    const clinic = await this.persistence.clinic.findUnique({
      where: { id: clinicId },
      select: { settings: true },
    });

    if (!clinic) return null;

    const settings = this.toRecord(clinic.settings);

    return {
      defaultInstructions: this.readString(settings, 'defaultInstructions', ''),
      defaultFooterText: this.readString(settings, 'defaultFooterText', ''),
      includeClinicHeader: this.readBoolean(
        settings,
        'includeClinicHeader',
        true,
      ),
      includeDoctorSignature: this.readBoolean(
        settings,
        'includeDoctorSignature',
        true,
      ),
      includeQRCode: this.readBoolean(settings, 'includeQRCode', false),
    };
  }

  async getOpdSlipSettings(clinicId: string) {
    const clinic = await this.persistence.clinic.findUnique({
      where: { id: clinicId },
      select: { settings: true },
    });

    if (!clinic) return null;

    const settings = this.toRecord(clinic.settings);

    return {
      revisitValidityDays: this.readNumber(
        settings,
        'opdSlipRevisitValidityDays',
        0,
      ),
      footerNote: this.readString(settings, 'opdSlipFooterNote', ''),
    };
  }
}
