import { Injectable, Inject } from '@nestjs/common';
import { mapWithConcurrency } from '@workspace/utils';
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

const CLINIC_SIGNATURE_URL_CONCURRENCY = 8;

@Injectable()
export class ClinicDataQueryService {
  constructor(
    @Inject(CLINIC_DATA_REPOSITORY_TOKEN)
    private readonly repository: IClinicDataRepository,
    private readonly storedFileUrlResolver: StoredFileUrlResolverService,
  ) {}

  async findAll() {
    const clinics = await this.repository.findAll();
    return mapWithConcurrency(
      clinics,
      CLINIC_SIGNATURE_URL_CONCURRENCY,
      async (clinic) => {
        const settings = toRecord(clinic.settings);
        return attachResolvedClinicSignatureUrl(
          {
            ...clinic,
            phoneNumber: clinic.phone,
            gstin: readOptionalString(settings, 'gstin'),
            description: readString(settings, 'description'),
            openingTime: readString(settings, 'openingTime'),
            closingTime: readString(settings, 'closingTime'),
            workingDays: readStringArray(settings, 'workingDays'),
            consultationDuration: readNumber(settings, 'consultationDuration'),
          },
          this.storedFileUrlResolver,
        );
      },
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

    return mapWithConcurrency(
      doctorClinics,
      CLINIC_SIGNATURE_URL_CONCURRENCY,
      async (dc) => {
        const clinic = dc.clinic;
        const settings = toRecord(clinic.settings);
        return attachResolvedClinicSignatureUrl(
          {
            ...clinic,
            phoneNumber: clinic.phone,
            gstin: readOptionalString(settings, 'gstin'),
            description: readString(settings, 'description'),
            openingTime: readString(settings, 'openingTime'),
            closingTime: readString(settings, 'closingTime'),
            workingDays: readStringArray(settings, 'workingDays'),
            consultationDuration: readNumber(settings, 'consultationDuration'),
          },
          this.storedFileUrlResolver,
        );
      },
    );
  }

  async getClinicStats(clinicId: string) {
    return this.repository.getStats(clinicId);
  }

  async searchActive(query: string): Promise<ClinicSearchResult[]> {
    return this.repository.searchActive(query);
  }
}
