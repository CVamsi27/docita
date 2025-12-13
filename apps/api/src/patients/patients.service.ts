import { Injectable } from '@nestjs/common';
import { Patient } from '@workspace/types';
import { PatientsRepository } from '../common/repositories';

/**
 * DTO for creating patients - matches what controller sends
 */
interface CreatePatientData {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email?: string;
  address?: string;
  gender: string;
  dateOfBirth: Date | string;
  bloodGroup?: string;
  allergies?: string;
  medicalHistory?: string[];
  clinicId: string;
}

/**
 * Service for patient-related business logic.
 *
 * Uses PatientsRepository for data access, keeping business logic
 * separated from database operations.
 */
@Injectable()
export class PatientsService {
  constructor(private readonly patientsRepository: PatientsRepository) {}

  /**
   * Find all patients for a clinic with pagination
   */
  async findAll(
    clinicId: string,
    options?: {
      limit?: number;
      cursor?: string;
      search?: string;
    },
  ) {
    return this.patientsRepository.findAll(clinicId, options);
  }

  /**
   * Find a single patient by ID
   */
  async findOne(id: string): Promise<Patient> {
    return this.patientsRepository.findOneOrFail(id);
  }

  /**
   * Create a new patient
   */
  async create(data: CreatePatientData) {
    return this.patientsRepository.create(data);
  }

  /**
   * Update an existing patient
   */
  async update(
    id: string,
    data: Partial<Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<Patient> {
    return this.patientsRepository.update(id, data);
  }

  /**
   * Delete a patient
   */
  async remove(id: string): Promise<void> {
    return this.patientsRepository.delete(id);
  }

  /**
   * Get all appointments for a patient
   */
  async getAppointments(patientId: string) {
    return this.patientsRepository.getAppointments(patientId);
  }

  /**
   * Get all documents for a patient
   */
  async getDocuments(patientId: string) {
    return this.patientsRepository.getDocuments(patientId);
  }

  /**
   * Get all tags for a patient
   */
  async getTags(patientId: string) {
    return this.patientsRepository.getTags(patientId);
  }
}
