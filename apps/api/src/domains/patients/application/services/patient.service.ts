import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import {
  IPatientRepository,
  PatientSearchParams,
} from '@/domains/patients/core/repositories/patient.repository.interface';
import { Patient } from '@/domains/patients/core/entities/patient.entity';
import { randomUUID } from 'crypto';
import {
  type PatientDomainCreateInput,
  type PatientDomainUpdateInput,
} from '@workspace/types';

@Injectable()
export class PatientService {
  constructor(
    @Inject('IPatientRepository')
    private readonly patientRepository: IPatientRepository,
  ) {}

  async createPatient(data: PatientDomainCreateInput): Promise<Patient> {
    const patient = new Patient({
      ...data,
      id: randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
    });

    await this.patientRepository.save(patient);
    return patient;
  }

  async getPatient(id: string, clinicId?: string): Promise<Patient> {
    const patient = await this.patientRepository.findById(id);
    if (!patient) {
      throw new NotFoundException(`Patient with ID ${id} not found`);
    }

    if (clinicId && patient.clinicId !== clinicId) {
      throw new NotFoundException(`Patient with ID ${id} not found`);
    }

    return patient;
  }

  async listPatients(params: PatientSearchParams) {
    return this.patientRepository.findAll(params);
  }

  async updatePatient(
    id: string,
    data: PatientDomainUpdateInput,
  ): Promise<void> {
    const patient = await this.getPatient(id);

    if (data.email !== undefined || data.phoneNumber !== undefined) {
      patient.updateContactInfo(data.email, data.phoneNumber);
    }

    await this.patientRepository.update(patient);
  }
}
