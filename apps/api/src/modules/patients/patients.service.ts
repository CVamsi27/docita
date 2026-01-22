import { Injectable, Optional } from '@nestjs/common';
import { Patient, CreatePatientInput } from '@workspace/types';
import { PatientsRepository } from '../../common/repositories';
import { DomainEventService, DomainEvents } from '../../common/events';

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

    // Data is automatically decrypted by Prisma Middleware "EncryptionMiddleware"
    // const decryptedItems = result.items.map((patient) =>
    //   this.encryptionService.decryptPatientData(patient),
    // );

    return result;
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
  async create(data: CreatePatientInput, userId?: string) {
    if (!data.clinicId) {
      throw new Error('Clinic ID is required to create a patient');
    }

    // Encryption is handled by Prisma Middleware "EncryptionMiddleware" transparently
    const patient = await this.patientsRepository.create({
      ...data,
      clinicId: data.clinicId,
    });

    const decryptedPatient = patient;

    // Emit event for other modules to react (only if eventService is available)
    if (this.eventService) {
      const mrn = decryptedPatient.mrn;
      // Use non-null assertion since these are required by schema
      this.eventService.emit(
        DomainEvents.PATIENT_CREATED,
        {
          patientId: decryptedPatient.id as string,
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

    // Encryption is handled by Prisma Middleware "EncryptionMiddleware" transparently
    // const encryptedUpdateData = this.encryptionService.encryptPatientData(data);

    const patient = await this.patientsRepository.update(id, data);

    const decryptedPatient = patient;
    const decryptedOldPatient = oldPatient;

    // Emit event with changes (only if eventService is available)
    if (this.eventService && context) {
      const changes: Record<string, { old: unknown; new: unknown }> = {};
      for (const key of Object.keys(data)) {
        const dataKey = key as keyof typeof data;
        if (
          decryptedOldPatient &&
          decryptedOldPatient[dataKey] !== data[dataKey]
        ) {
          changes[key] = {
            old: decryptedOldPatient[dataKey],
            new: data[dataKey],
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
      const patient = patientRaw;
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
