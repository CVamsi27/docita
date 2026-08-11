/**
 * Domain-level command DTOs for prescription persistence.
 *
 * These types describe *intent* (what the application layer wants to do),
 * not persistence shape (how Prisma stores it). The repository implementation
 * maps these to Prisma calls internally, keeping the application layer
 * free of ORM imports.
 */

export interface CreatePrescriptionMedicationCommand {
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
  startDate?: Date;
  endDate?: Date;
  isPRN?: boolean;
  prnInstructions?: string;
  prnMaxDose?: string;
  specialInstructions?: string;
  indication?: string;
}

/**
 * Command to create a new prescription. IDs are plain strings — the
 * repository maps them to Prisma `connect` calls internally.
 */
export interface CreatePrescriptionCommand {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  instructions?: string;
  doctorName: string;
  doctorEmail: string;
  doctorPhone?: string;
  doctorSpecialization?: string;
  doctorRole?: string;
  doctorRegistrationNumber?: string;
  doctorLicenseNumber?: string;
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
