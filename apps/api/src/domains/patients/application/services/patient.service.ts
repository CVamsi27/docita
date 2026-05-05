import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
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

  private normalizeMrn(mrn: string | undefined): string | undefined {
    const normalized = mrn?.trim();
    return normalized ? normalized : undefined;
  }

  private async assertMrnAvailable(
    mrn: string | undefined,
    clinicId: string,
    currentPatientId?: string,
  ): Promise<void> {
    if (!mrn) return;

    const existing = await this.patientRepository.findByMrn(mrn, clinicId);
    if (existing && existing.id !== currentPatientId) {
      throw new ConflictException(
        'A patient with this MRN already exists in this clinic',
      );
    }
  }

  async createPatient(data: PatientDomainCreateInput): Promise<Patient> {
    const mrn = this.normalizeMrn(data.mrn);
    await this.assertMrnAvailable(mrn, data.clinicId);

    const patient = new Patient({
      ...data,
      mrn,
      id: randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
    });

    await this.patientRepository.save(patient);
    return patient;
  }

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

  async updatePatient(
    id: string,
    data: PatientDomainUpdateInput,
    clinicId: string,
  ): Promise<Patient> {
    const patient = await this.getPatient(id, clinicId);
    const mrn = this.normalizeMrn(data.mrn);

    await this.assertMrnAvailable(mrn, patient.clinicId, patient.id);
    patient.updateProfile({ ...data, mrn });

    await this.patientRepository.update(patient);
    const updated = await this.patientRepository.findById(id, clinicId);
    if (!updated) {
      throw new NotFoundException(`Patient with ID ${id} not found`);
    }
    return updated;
  }

  async deletePatient(id: string, clinicId: string): Promise<void> {
    await this.getPatient(id, clinicId);
    await this.patientRepository.delete(id, clinicId);
  }
}
