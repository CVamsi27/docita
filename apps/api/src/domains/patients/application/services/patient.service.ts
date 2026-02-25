/**
 * Patient Application Service
 */

import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import {
  IPatientRepository,
  PatientSearchParams,
} from '../../core/repositories/patient.repository.interface';
import { Patient, PatientProps } from '../../core/entities/patient.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PatientService {
  constructor(
    @Inject('IPatientRepository')
    private readonly patientRepository: IPatientRepository,
  ) {}

  async createPatient(
    data: Omit<PatientProps, 'id' | 'createdAt' | 'updatedAt' | 'version'>,
  ): Promise<Patient> {
    const patient = new Patient({
      ...data,
      id: uuidv4(),
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

  async updatePatient(id: string, data: Partial<PatientProps>): Promise<void> {
    const patient = await this.getPatient(id);

    if (data.email || data.phoneNumber) {
      patient.updateContactInfo(data.email, data.phoneNumber);
    }

    await this.patientRepository.update(patient);
  }
}
