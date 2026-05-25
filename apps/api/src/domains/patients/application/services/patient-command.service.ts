import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { IPatientRepository } from '@/domains/patients/core/repositories/patient.repository.interface';
import { Patient } from '@/domains/patients/core/entities/patient.entity';
import { randomUUID } from 'crypto';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import {
  type PatientDomainCreateInput,
  type PatientDomainUpdateInput,
} from '@workspace/types';
import { assertMrnAvailable } from './patient-access.helpers';
import { PatientQueryService } from './patient-query.service';

@Injectable()
export class PatientCommandService {
  constructor(
    @Inject('IPatientRepository')
    private readonly patientRepository: IPatientRepository,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
    private readonly queryService: PatientQueryService,
  ) {}

  async createPatient(data: PatientDomainCreateInput): Promise<Patient> {
    const mrn = Patient.normalizeMrn(data.mrn);
    await assertMrnAvailable(this.patientRepository, mrn, data.clinicId);

    const patient = new Patient({
      ...data,
      mrn,
      id: randomUUID(),
      createdAt: this.clock.now(),
      updatedAt: this.clock.now(),
      version: 1,
    });

    await this.patientRepository.save(patient);
    return patient;
  }

  async updatePatient(
    id: string,
    data: PatientDomainUpdateInput,
    clinicId: string,
  ): Promise<Patient> {
    const patient = await this.queryService.getPatient(id, clinicId);
    const mrn = Patient.normalizeMrn(data.mrn);

    await assertMrnAvailable(
      this.patientRepository,
      mrn,
      patient.clinicId,
      patient.id,
    );
    patient.updateProfile({ ...data, mrn }, this.clock.now());

    await this.patientRepository.update(patient);
    const updated = await this.patientRepository.findById(id, clinicId);
    if (!updated) {
      throw new NotFoundException(`Patient with ID ${id} not found`);
    }
    return updated;
  }

  async deletePatient(id: string, clinicId: string): Promise<void> {
    await this.queryService.getPatient(id, clinicId);
    await this.patientRepository.delete(id, clinicId);
  }
}
