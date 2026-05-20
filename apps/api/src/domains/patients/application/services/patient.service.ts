import { Injectable } from '@nestjs/common';
import { PatientSearchParams } from '@/domains/patients/core/repositories/patient.repository.interface';
import { Patient } from '@/domains/patients/core/entities/patient.entity';
import {
  type PatientDomainCreateInput,
  type PatientDomainUpdateInput,
} from '@workspace/types';
import { PatientCommandService } from './patient-command.service';
import { PatientQueryService } from './patient-query.service';

/**
 * Facade — delegates patient reads and mutations to query/command services.
 */
@Injectable()
export class PatientService {
  constructor(
    private readonly queryService: PatientQueryService,
    private readonly commandService: PatientCommandService,
  ) {}

  createPatient(data: PatientDomainCreateInput): Promise<Patient> {
    return this.commandService.createPatient(data);
  }

  getPatient(id: string, clinicId: string): Promise<Patient> {
    return this.queryService.getPatient(id, clinicId);
  }

  findByClinicIdAndPhoneNumber(
    clinicId: string,
    phoneNumber: string,
  ): Promise<Patient | null> {
    return this.queryService.findByClinicIdAndPhoneNumber(
      clinicId,
      phoneNumber,
    );
  }

  listPatients(params: PatientSearchParams) {
    return this.queryService.listPatients(params);
  }

  updatePatient(
    id: string,
    data: PatientDomainUpdateInput,
    clinicId: string,
  ): Promise<Patient> {
    return this.commandService.updatePatient(id, data, clinicId);
  }

  deletePatient(id: string, clinicId: string): Promise<void> {
    return this.commandService.deletePatient(id, clinicId);
  }
}
