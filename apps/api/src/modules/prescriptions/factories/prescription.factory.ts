import { Injectable, BadRequestException } from '@nestjs/common';
import { Prescription, ApprovalStatus } from '@workspace/db';

/**
 * Prescription Factory
 * Encapsulates creation logic for Prescription entities
 * Ensures all prescriptions meet medical and business rule constraints
 */
@Injectable()
export class PrescriptionFactory {
  /**
   * Create prescription builder for fluent interface
   */
  builder(): PrescriptionBuilder {
    return new PrescriptionBuilder();
  }

  /**
   * Validate prescription data before persisting
   */
  validatePrescription(data: Partial<Prescription>): void {
    if (!data.patientId) {
      throw new BadRequestException('Patient ID is required');
    }

    if (!data.doctorId) {
      throw new BadRequestException('Doctor ID is required');
    }

    if (!data.appointmentId) {
      throw new BadRequestException('Appointment ID is required');
    }

    if (!data.medications || data.medications.length === 0) {
      throw new BadRequestException('At least one medication is required');
    }

    // Validate each medication
    data.medications.forEach((med, index) => {
      if (!med.name) {
        throw new BadRequestException(`Medication ${index + 1}: medication name is required`);
      }

      if (!med.dosage) {
        throw new BadRequestException(`Medication ${index + 1}: dosage is required`);
      }

      if (!med.frequency) {
        throw new BadRequestException(`Medication ${index + 1}: frequency is required`);
      }

      if (!med.duration) {
        throw new BadRequestException(`Medication ${index + 1}: duration must be specified`);
      }
    });

    // Validate instructions length
    if (data.instructions && data.instructions.length > 2000) {
      throw new BadRequestException('Special instructions cannot exceed 2000 characters');
    }
  }
}

/**
 * Medication in prescription
 */
export interface PrescriptionMedication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string; // in days
  route?: string;
  instructions?: string;
}

/**
 * Fluent builder for creating Prescription entities
 */
export class PrescriptionBuilder {
  private data: Partial<Prescription> = {
    approvalStatus: ApprovalStatus.PENDING,
    medications: [],
  };

  withPatientId(patientId: string): PrescriptionBuilder {
    this.data.patientId = patientId;
    return this;
  }

  withDoctorId(doctorId: string): PrescriptionBuilder {
    this.data.doctorId = doctorId;
    return this;
  }

  withAppointmentId(appointmentId: string): PrescriptionBuilder {
    this.data.appointmentId = appointmentId;
    return this;
  }

  addMedication(medication: PrescriptionMedication): PrescriptionBuilder {
    if (!this.data.medications) {
      this.data.medications = [];
    }
    this.data.medications.push(medication as any);
    return this;
  }

  withMedications(medications: PrescriptionMedication[]): PrescriptionBuilder {
    this.data.medications = medications as any;
    return this;
  }

  withInstructions(instructions: string): PrescriptionBuilder {
    this.data.instructions = instructions;
    return this;
  }

  withApprovalStatus(status: ApprovalStatus): PrescriptionBuilder {
    this.data.approvalStatus = status;
    return this;
  }

  build(): Partial<Prescription> {
    return this.data;
  }
}
