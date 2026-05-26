import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import {
  IPatientRepository,
  PATIENT_REPOSITORY_TOKEN,
  PatientSearchParams,
} from '@/domains/patients/core/repositories/patient.repository.interface';
import { Patient } from '@/domains/patients/core/entities/patient.entity';

@Injectable()
export class PatientQueryService {
  constructor(
    @Inject(PATIENT_REPOSITORY_TOKEN)
    private readonly patientRepository: IPatientRepository,
  ) {}

  async getPatient(id: string, clinicId: string): Promise<Patient> {
    const patient = await this.patientRepository.findById(id, clinicId);
    if (!patient) {
      throw new NotFoundException(`Patient with ID ${id} not found`);
    }
    return patient;
  }

  async findByClinicIdAndPhoneNumber(
    clinicId: string,
    phoneNumber: string,
  ): Promise<Patient | null> {
    return this.patientRepository.findByClinicIdAndPhoneNumber(
      clinicId,
      phoneNumber,
    );
  }

  async listPatients(params: PatientSearchParams) {
    return this.patientRepository.findAll(params);
  }
}
