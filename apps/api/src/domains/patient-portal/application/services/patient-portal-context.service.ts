import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import {
  IPatientPortalRepository,
  PATIENT_PORTAL_REPOSITORY_TOKEN,
} from '@/domains/patient-portal/core/repositories/patient-portal.repository.interface';

/**
 * Thin facade — delegates patient portal context resolution to IPatientPortalRepository.
 */
@Injectable()
export class PatientPortalContextService {
  constructor(
    @Inject(PATIENT_PORTAL_REPOSITORY_TOKEN)
    private readonly repository: IPatientPortalRepository,
  ) {}

  async getPatientContext(userId: string) {
    const patient = await this.repository.findPatientByUserId(userId);

    if (!patient) {
      throw new UnauthorizedException('Patient not found');
    }

    return {
      patient,
      patientId: patient.id,
      clinicId: patient.clinicId,
    };
  }
}
