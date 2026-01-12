import { Injectable, Optional } from '@nestjs/common';
import { Patient } from '@workspace/types';
import { PatientsRepository } from '../common/repositories';
import { DomainEventService, DomainEvents } from '../common/events';

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
  async create(data: CreatePatientData, userId?: string) {
    const patient = await this.patientsRepository.create(data);

    // Emit event for other modules to react (only if eventService is available)
    if (this.eventService) {
      const mrn = (patient as any).mrn as string | undefined;
      // Use non-null assertion since these are required by schema
      this.eventService.emit(
        DomainEvents.PATIENT_CREATED,
        {
          patientId: patient.id!,
          ...(mrn && { mrn }),
          firstName: patient.firstName,
          lastName: patient.lastName,
          phoneNumber: patient.phoneNumber,
        },
        {
          clinicId: data.clinicId,
          userId,
          source: 'PatientsService',
        },
      );
    }

    return patient;
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
    const patient = await this.patientsRepository.update(id, data);

    // Emit event with changes (only if eventService is available)
    if (this.eventService && context) {
      const changes: Record<string, { old: unknown; new: unknown }> = {};
      for (const key of Object.keys(data)) {
        if (oldPatient && (oldPatient as any)[key] !== (data as any)[key]) {
          changes[key] = {
            old: (oldPatient as any)[key],
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

    return patient;
  }

  /**
   * Delete a patient
   */
  async remove(
    id: string,
    context?: { clinicId: string; userId?: string; reason?: string },
  ): Promise<void> {
    const patient = await this.patientsRepository.findOne(id);
    await this.patientsRepository.delete(id);

    // Emit event (only if eventService is available)
    if (this.eventService && context && patient) {
      const mrn = (patient as any).mrn as string | undefined;
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
