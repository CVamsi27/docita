import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { PrescriptionPdfService } from './prescription-pdf.service';
import { IPrescriptionRepository } from './repositories/prescription.repository.interface';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrescriptionCreatedEvent } from './events/prescription-created.event';
import {
  formatDate,
  calculateAge,
  DATE_FORMATS,
  DEFAULT_TIMEZONE,
  DEFAULT_LOCALE,
  checkPrescriptionAllergies,
  validateDosage,
} from '@workspace/utils';

import { Specialization, HospitalRole } from '@workspace/types';
import { Prisma } from '@workspace/db';

@Injectable()
export class PrescriptionsService {
  private readonly logger = new Logger(PrescriptionsService.name);

  constructor(
    @Inject('IPrescriptionRepository')
    private readonly repository: IPrescriptionRepository,
    private pdfService: PrescriptionPdfService,
    private eventEmitter: EventEmitter2,
  ) {}

  async findAll(clinicId: string, params?: { search?: string; date?: string }) {
    return this.repository.findAll({
      clinicId,
      ...params,
    });
  }

  async findOne(id: string, clinicId?: string) {
    const prescription = await this.repository.findById(id);

    if (!prescription) {
      throw new NotFoundException(`Prescription with ID ${id} not found`);
    }

    // Verify clinic ownership via patient relation
    if (clinicId) {
      const rxData = prescription as unknown as {
        patient?: { clinic?: { id: string } };
      };
      if (rxData.patient?.clinic?.id && rxData.patient.clinic.id !== clinicId) {
        throw new NotFoundException(`Prescription with ID ${id} not found`);
      }
    }

    return prescription;
  }

  async create(data: {
    appointmentId: string;
    patientId: string;
    doctorId: string;
    instructions?: string;
    medications: Array<{
      name: string;
      dosage: string;
      frequency: string;
      duration: string;
      route?: string;
    }>;
    doctorName?: string;
    doctorEmail?: string;
    doctorPhone?: string;
    doctorSpecialization?: Specialization;
    doctorRole?: HospitalRole;
    doctorRegistrationNumber?: string;
    doctorLicenseNumber?: string;
    clinicId?: string;
  }) {
    // Fetch patient with allergies for validation
    const patient = await this.repository.findPatientWithAllergies(
      data.patientId,
    );

    if (!patient) {
      throw new NotFoundException(
        `Patient with ID ${data.patientId} not found`,
      );
    }

    // Check for drug allergies
    const patientAllergies =
      (
        patient as unknown as {
          patientAllergies?: Array<{
            allergen: string;
            allergyType: string;
            severity: string;
            reaction?: string | null;
          }>;
        }
      ).patientAllergies || [];
    if (Array.isArray(patientAllergies) && patientAllergies.length > 0) {
      const allergyCheck = checkPrescriptionAllergies(
        data.medications,
        patientAllergies,
      );

      // If critical allergies found, block prescription
      if (allergyCheck.criticalWarnings.length > 0) {
        throw new BadRequestException({
          message: 'Cannot prescribe medications due to critical allergies',
          allergies: allergyCheck.criticalWarnings,
          medicationChecks: allergyCheck.medicationChecks,
        });
      }

      // Log warnings for moderate allergies (allow but warn)
      if (allergyCheck.allWarnings.length > 0) {
        this.logger.warn(
          `Prescription created with allergy warnings for patient ${data.patientId}:`,
          allergyCheck.allWarnings,
        );
      }
    }

    // Validate dosages
    for (const med of data.medications) {
      const dosageValidation = validateDosage(med.name, med.dosage);
      if (
        dosageValidation.severity === 'critical' &&
        !dosageValidation.isValid
      ) {
        throw new BadRequestException({
          message: `Invalid dosage for ${med.name}`,
          validation: dosageValidation,
        });
      } else if (dosageValidation.severity === 'warning') {
        this.logger.warn(
          `Dosage warning for ${med.name}: ${dosageValidation.message}`,
        );
      }
    }

    const prescription = await this.repository.create({
      appointment: { connect: { id: data.appointmentId } },
      patient: { connect: { id: data.patientId } },
      doctor: { connect: { id: data.doctorId } },
      instructions: data.instructions,
      // Save doctor context snapshot (Phase 5)
      doctorName: data.doctorName,
      doctorEmail: data.doctorEmail,
      doctorPhone: data.doctorPhone,
      doctorSpecialization: data.doctorSpecialization || null,
      doctorRole: data.doctorRole || null,
      doctorRegistrationNumber: data.doctorRegistrationNumber,
      doctorLicenseNumber: data.doctorLicenseNumber,
      medications: {
        create: data.medications.map((med) => ({
          name: med.name,
          dosage: med.dosage,
          frequency: med.frequency,
          duration: med.duration,
          route: med.route || 'PO',
        })),
      },
    });

    // Emit event for side effects (notifications)
    if (data.clinicId) {
      this.eventEmitter.emit(
        'prescription.created',
        new PrescriptionCreatedEvent(prescription.id, data.clinicId),
      );
    }

    return prescription;
  }

  async generatePDF(
    id: string,
    clinicIdOrTimezone?: string,
    locale: string = DEFAULT_LOCALE,
  ): Promise<Buffer> {
    // If clinicIdOrTimezone looks like a clinicId (not a timezone), use it for scoping
    const isClinicId = clinicIdOrTimezone && !clinicIdOrTimezone.includes('/');
    const clinicId = isClinicId ? clinicIdOrTimezone : undefined;
    const timezone = isClinicId
      ? DEFAULT_TIMEZONE
      : clinicIdOrTimezone || DEFAULT_TIMEZONE;
    const prescription = await this.findOne(id, clinicId);
    // findOne uses repository.findById which uses include patient.

    // Safety check for relations
    const prescriptionWithRelations = prescription as unknown as {
      id: string;
      patient: {
        id: string;
        firstName: string;
        lastName: string;
        phoneNumber?: string;
        email?: string;
        gender?: string;
        dateOfBirth: Date;
        clinic?: {
          name?: string;
          address?: string;
          phone?: string;
          email?: string;
        };
      };
      doctor: {
        name: string;
        qualification?: string;
        registrationNumber?: string;
        signatureUrl?: string;
      };
      medications: Array<{
        id: string;
        medicineId: string | null;
        medicineName: string;
        dosage: string;
        frequency: string;
        duration: string;
        instructions: string | null;
        quantity: number;
      }>;
    };

    const patientAge = calculateAge(
      prescriptionWithRelations.patient.dateOfBirth,
    );
    const clinic = prescriptionWithRelations.patient.clinic;

    return this.pdfService.generate({
      prescriptionId: prescription.id.slice(0, 8).toUpperCase(),
      clinic: {
        name: clinic?.name || process.env.CLINIC_NAME || 'Docita Clinic',
        address: clinic?.address || process.env.CLINIC_ADDRESS,
        phone: clinic?.phone || process.env.CLINIC_PHONE,
        email: clinic?.email || process.env.CLINIC_EMAIL,
      },
      doctor: {
        name: prescriptionWithRelations.doctor.name,
        qualification:
          prescriptionWithRelations.doctor.qualification || undefined,
        registrationNumber:
          prescriptionWithRelations.doctor.registrationNumber || undefined,
        signatureUrl:
          prescriptionWithRelations.doctor.signatureUrl || undefined,
      },
      patient: {
        name: `${prescriptionWithRelations.patient.firstName} ${prescriptionWithRelations.patient.lastName}`,
        phoneNumber: prescriptionWithRelations.patient.phoneNumber,
        email: prescriptionWithRelations.patient.email || undefined,
        gender: prescriptionWithRelations.patient.gender || undefined,
        age: patientAge ?? undefined,
        patientId: prescriptionWithRelations.patient.id
          .slice(0, 8)
          .toUpperCase(),
        // TODO: Pass allergies if available in the fetch
      },
      medications: prescriptionWithRelations.medications.map(
        (med: {
          id: string;
          medicineId: string | null;
          medicineName: string;
          dosage: string;
          frequency: string;
          duration: string;
          instructions: string | null;
          quantity: number;
        }) => ({
          name: med.medicineName,
          dosage: med.dosage,
          route: 'PO', // Default route
          frequency: med.frequency,
          duration: med.duration,
        }),
      ),
      instructions: prescription.instructions || undefined,
      date: new Date(), // Use current date for PDF generation time
      validityDays: 30,
    });
  }
}
