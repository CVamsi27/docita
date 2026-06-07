import { Injectable, Inject } from '@nestjs/common';
import { StoredFileUrlResolverService } from '@/domains/documents/application/services/stored-file-url-resolver.service';
import {
  IClinicDataRepository,
  CLINIC_DATA_REPOSITORY_TOKEN,
  ClinicSearchResult,
} from '@/domains/clinics/core/repositories/clinic-data.repository.interface';
import {
  attachResolvedClinicSignatureUrl,
  parseEnterpriseBranding,
  readNumber,
  readOptionalString,
  readString,
  readStringArray,
  toRecord,
} from './clinic-data.helpers';

/**
 * Projects the settings-derived fields shared by every clinic list/search
 * entry (`findAll`, `getUserClinics`). `findOne` adds extra fields
 * (`subscriptionGraceUntil`, `enterpriseBranding`) on top of this same base,
 * so centralizing the shared projection keeps the two list paths from
 * drifting apart key-by-key.
 */
function projectClinicListEntry<T extends { settings: unknown; phone: string }>(
  clinic: T,
) {
  const settings = toRecord(clinic.settings);
  return {
    ...clinic,
    phoneNumber: clinic.phone,
    gstin: readOptionalString(settings, 'gstin'),
    description: readString(settings, 'description'),
    openingTime: readString(settings, 'openingTime'),
    closingTime: readString(settings, 'closingTime'),
    workingDays: readStringArray(settings, 'workingDays'),
    consultationDuration: readNumber(settings, 'consultationDuration'),
  };
}

@Injectable()
export class ClinicDataQueryService {
  constructor(
    @Inject(CLINIC_DATA_REPOSITORY_TOKEN)
    private readonly repository: IClinicDataRepository,
    private readonly storedFileUrlResolver: StoredFileUrlResolverService,
  ) {}

  async findAll() {
    const clinics = await this.repository.findAll();
    return Promise.all(
      clinics.map((clinic) =>
        attachResolvedClinicSignatureUrl(
          projectClinicListEntry(clinic),
          this.storedFileUrlResolver,
        ),
      ),
    );
  }

  async findOne(id: string) {
    const clinic = await this.repository.findById(id);
    if (!clinic) return null;

    const { subscription, ...clinicRow } = clinic;
    const settings = toRecord(clinicRow.settings);
    return attachResolvedClinicSignatureUrl(
      {
        ...clinicRow,
        subscriptionGraceUntil: subscription?.graceUntil ?? null,
        phoneNumber: clinicRow.phone,
        gstin: readOptionalString(settings, 'gstin'),
        description: readString(settings, 'description'),
        openingTime: readString(settings, 'openingTime'),
        closingTime: readString(settings, 'closingTime'),
        workingDays: readStringArray(settings, 'workingDays'),
        consultationDuration: readNumber(settings, 'consultationDuration'),
        enterpriseBranding: parseEnterpriseBranding(clinicRow.branding),
      },
      this.storedFileUrlResolver,
    );
  }

  async getUserClinics(userId: string) {
    const doctorClinics = await this.repository.findDoctorClinics(userId);

    return Promise.all(
      doctorClinics.map((dc) =>
        attachResolvedClinicSignatureUrl(
          projectClinicListEntry(dc.clinic),
          this.storedFileUrlResolver,
        ),
      ),
    );
  }

  async getClinicStats(clinicId: string) {
    return this.repository.getStats(clinicId);
  }

  async searchActive(query: string): Promise<ClinicSearchResult[]> {
    return this.repository.searchActive(query);
  }
}
