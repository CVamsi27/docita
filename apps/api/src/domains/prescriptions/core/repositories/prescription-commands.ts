/**
 * Domain-level command DTOs for prescription persistence.
 *
 * These types describe *intent* (what the application layer wants to do),
 * not persistence shape (how Prisma stores it). The repository implementation
 * maps these to Prisma calls internally, keeping the application layer
 * free of ORM imports.
 *
 * `CreatePrescriptionCommand` doubles as the application-layer facade DTO: it
 * carries the clinic scope and application context (`isTeleconsultation?`)
 * alongside the persistence-relevant fields. The service validates the clinic
 * scope and forwards it to the repository for the persisted clinic relation;
 * the service consumes modality to enforce the telemedicine substance block.
 */

import type { HospitalRole, Specialization } from '@workspace/types';

export interface CreatePrescriptionMedicationCommand {
  // The index signature is required so the medication DTO stays assignable
  // to the structural `{ name: string; [key: string]: unknown }` shape that
  // `@workspace/utils` validators (`checkPrescriptionAllergies`,
  // `validateControlledSubstances`) accept.
  [key: string]: unknown;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  route?: string;
  ndcCode?: string;
  rxNormCui?: string;
  dosageForm?: string;
  strengthValue?: number;
  strengthUnit?: string;
  sigCode?: string;
  quantity?: number;
  refillsAllowed?: number;
  dispenseAsWritten?: boolean;
  startDate?: Date | string;
  endDate?: Date | string;
  isPRN?: boolean;
  prnInstructions?: string;
  prnMaxDose?: string;
  specialInstructions?: string;
  indication?: string;
}

/**
 * Command to create a new prescription. IDs are plain strings — the
 * repository maps them to Prisma `connect` calls internally. The
 * `clinicId?` field is validated by the service and repository before creation;
 * `isTeleconsultation?` is application-layer context. `doctorName` and
 * `doctorEmail` are optional here so the application service can
 * backfill them from the doctor profile when the caller does not
 * supply them; the repository will fall back to the resolved values.
 */
export interface CreatePrescriptionCommand {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  instructions?: string;
  doctorName?: string;
  doctorEmail?: string;
  doctorPhone?: string;
  doctorSpecialization?: Specialization;
  doctorRole?: HospitalRole;
  doctorRegistrationNumber?: string;
  doctorLicenseNumber?: string;
  /** Clinic scope — validated before creation and persisted as the clinic relation. */
  clinicId?: string;
  /**
   * True when this prescription is issued during a teleconsultation.
   * Controlled substances (Schedule X / NDPS) cannot be prescribed via
   * telemedicine (NMC Telemedicine Practice Guidelines, 2020). When omitted,
   * the application service resolves modality from the linked appointment.
   */
  isTeleconsultation?: boolean;
  medications: CreatePrescriptionMedicationCommand[];
}

/**
 * Command to update an existing prescription. Only includes fields the
 * application layer actually writes — extended as new update needs arise.
 */
export interface UpdatePrescriptionCommand {
  pdfUrl?: string;
  pdfGeneratedAt?: Date;
  pdfTemplateVersion?: number;
}
