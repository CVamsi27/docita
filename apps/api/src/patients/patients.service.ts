import { Injectable, Optional } from '@nestjs/common';
import { Patient } from '@workspace/types';
import { PatientsRepository } from '../common/repositories';
import { DomainEventService, DomainEvents } from '../common/events';
import { EncryptionService } from '../common/encryption.service';

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
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

/**
 * Service for patient-related business logic.
 *
 * Uses PatientsRepository for data access, keeping business logic
 * separated from database operations.
 *
 * Emits domain events for cross-module communication.
 */
@Injectable()
export class PatientsService {
  constructor(
    private readonly patientsRepository: PatientsRepository,
    private readonly encryptionService: EncryptionService,
    @Optional() private readonly eventService?: DomainEventService,
  ) {}

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
    // Note: Search relies on exact matches or backend logic that handles encrypted search if implemented
    // For now, we assume simple listing. Search on encrypted fields won't work out-of-the-box without deterministic encryption or blind indexing
    const result = await this.patientsRepository.findAll(clinicId, options);

    // Decrypt sensitive data for each patient
    const decryptedItems = result.items.map((patient) =>
      this.encryptionService.decryptPatientData(patient),
    );

    return {
      ...result,
      items: decryptedItems,
    };
  }

  /**
   * Find a single patient by ID
   */
  async findOne(id: string): Promise<Patient> {
    const patient = await this.patientsRepository.findOneOrFail(id);
    return this.encryptionService.decryptPatientData(patient);
  }

  /**
   * Create a new patient
   */
  async create(data: CreatePatientData, userId?: string) {
    // Encrypt sensitive data before saving
    const encryptedData = this.encryptionService.encryptPatientData(data);

    const patient = await this.patientsRepository.create(encryptedData);

    // Decrypt for return value
    const decryptedPatient = this.encryptionService.decryptPatientData(patient);

    // Emit event for other modules to react (only if eventService is available)
    if (this.eventService) {
      const mrn = decryptedPatient.mrn;
      // Use non-null assertion since these are required by schema
      this.eventService.emit(
        DomainEvents.PATIENT_CREATED,
        {
          patientId: decryptedPatient.id,
          ...(mrn && { mrn }),
          firstName: decryptedPatient.firstName,
          lastName: decryptedPatient.lastName,
          phoneNumber: decryptedPatient.phoneNumber,
        },
        {
          clinicId: data.clinicId,
          userId,
          source: 'PatientsService',
        },
      );
    }

    return decryptedPatient;
  }

  /**
   * Update an existing patient
   */
  async update(
    id: string,
    data: Partial<Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>>,
    context?: { clinicId: string; userId?: string },
  ): Promise<Patient> {
    const oldPatient = await this.patientsRepository.findOne(id);

    // Encrypt sensitive data if present in update
    const encryptedUpdateData = this.encryptionService.encryptPatientData(data);

    const patient = await this.patientsRepository.update(
      id,
      encryptedUpdateData,
    );

    // Decrypt for return value
    const decryptedPatient = this.encryptionService.decryptPatientData(patient);
    const decryptedOldPatient = oldPatient
      ? this.encryptionService.decryptPatientData(oldPatient)
      : null;

    // Emit event with changes (only if eventService is available)
    if (this.eventService && context) {
      const changes: Record<string, { old: unknown; new: unknown }> = {};
      for (const key of Object.keys(data)) {
        if (
          decryptedOldPatient &&
          decryptedOldPatient[key] !== (data as any)[key]
        ) {
          changes[key] = {
            old: decryptedOldPatient[key],
            new: (data as any)[key],
          };
        }
      }

      if (Object.keys(changes).length > 0) {
        this.eventService.emit(
          DomainEvents.PATIENT_UPDATED,
          { patientId: id, changes },
          {
            clinicId: context.clinicId,
            userId: context.userId,
            source: 'PatientsService',
          },
        );
      }
    }

    return decryptedPatient;
  }

  /**
   * Delete a patient
   */
  async remove(
    id: string,
    context?: { clinicId: string; userId?: string; reason?: string },
  ): Promise<void> {
    const patientRaw = await this.patientsRepository.findOne(id);
    await this.patientsRepository.delete(id);

    // Emit event (only if eventService is available)
    if (this.eventService && context && patientRaw) {
      const patient = this.encryptionService.decryptPatientData(patientRaw);
      const mrn = patient.mrn;
      this.eventService.emit(
        DomainEvents.PATIENT_DELETED,
        {
          patientId: id,
          ...(mrn && { mrn }),
          reason: context.reason,
        },
        {
          clinicId: context.clinicId,
          userId: context.userId,
          source: 'PatientsService',
        },
      );
    }
  }

  /**
   * Get all appointments for a patient
   */
  async getAppointments(patientId: string) {
    return this.patientsRepository.getAppointments(patientId);
  }

  /**
   * Get patient statistics (visits, adherence, etc.)
   */
  async getStatistics(patientId: string) {
    return this.patientsRepository.getStatistics(patientId);
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

  /**
   * Get complete medical history timeline for a patient
   * Returns all appointments with issue summaries, diagnoses, and dates
   */
  async getMedicalHistoryTimeline(patientId: string) {
    return this.patientsRepository.getMedicalHistoryTimeline(patientId);
  }
}
