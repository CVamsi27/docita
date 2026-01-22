import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PDFGeneratorService } from '../../common/services/pdf-generator.service';
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
    private prisma: PrismaService,
    private pdfGenerator: PDFGeneratorService,
    private eventEmitter: EventEmitter2,
  ) {}

  async findAll(clinicId: string, params?: { search?: string; date?: string }) {
    if (!clinicId) {
      return [];
    }

    const { search, date } = params || {};
    const whereCallback: Prisma.PrescriptionWhereInput = {
      patient: { clinicId },
    };

    if (search) {
      whereCallback.OR = [
        {
          patient: {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
        {
          medications: {
            some: {
              name: { contains: search, mode: 'insensitive' },
            },
          },
        },
      ];
    }

    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(startDate);
      endDate.setHours(23, 59, 59, 999);

      whereCallback.createdAt = {
        gte: startDate,
        lte: endDate,
      };
    }

    try {
      return await this.prisma.prescription.findMany({
        where: whereCallback,
        include: {
          medications: true,
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phoneNumber: true,
              gender: true,
              dateOfBirth: true,
            },
          },
          doctor: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(
        `Failed to find prescriptions: ${err.message}`,
        err.stack,
      );
      throw error;
    }
  }

  async findOne(id: string) {
    const prescription = await this.prisma.prescription.findUnique({
      where: { id },
      include: {
        medications: true,
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            email: true,
            gender: true,
            dateOfBirth: true,
            clinic: {
              select: {
                id: true,
                name: true,
                address: true,
                phone: true,
                email: true,
                logo: true,
              },
            },
          },
        },
        doctor: {
          select: {
            id: true,
            name: true,
            email: true,
            qualification: true,
            registrationNumber: true,
            signatureUrl: true,
          },
        },
      },
    });

    if (!prescription) {
      throw new NotFoundException(`Prescription with ID ${id} not found`);
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
    // Doctor context for audit trail (Phase 5)
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
    const patient = await this.prisma.patient.findUnique({
      where: { id: data.patientId },
      include: {
        patientAllergies: {
          where: { allergyType: 'DRUG' },
          select: {
            allergen: true,
            allergyType: true,
            severity: true,
            reaction: true,
          },
        },
      },
    });

    if (!patient) {
      throw new NotFoundException(
        `Patient with ID ${data.patientId} not found`,
      );
    }

    // Check for drug allergies
    if (patient.patientAllergies && patient.patientAllergies.length > 0) {
      const allergyCheck = checkPrescriptionAllergies(
        data.medications,
        patient.patientAllergies,
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

    const prescription = await this.prisma.prescription.create({
      data: {
        appointmentId: data.appointmentId,
        patientId: data.patientId,
        doctorId: data.doctorId,
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
      },
      include: {
        medications: true,
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          },
        },
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
    timezone: string = DEFAULT_TIMEZONE,
    locale: string = DEFAULT_LOCALE,
  ): Promise<Buffer> {
    const prescription = await this.findOne(id);
    const patientAge = calculateAge(prescription.patient.dateOfBirth);
    const clinic = prescription.patient.clinic;

    return this.pdfGenerator.generatePrescription({
      prescriptionId: prescription.id.slice(0, 8).toUpperCase(),
      clinic: {
        name: clinic?.name || process.env.CLINIC_NAME || 'Docita Clinic',
        address: clinic?.address || process.env.CLINIC_ADDRESS,
        phone: clinic?.phone || process.env.CLINIC_PHONE,
        email: clinic?.email || process.env.CLINIC_EMAIL,
      },
      doctor: {
        name: prescription.doctor.name,
        qualification: prescription.doctor.qualification || undefined,
        registrationNumber: prescription.doctor.registrationNumber || undefined,
        signatureUrl: prescription.doctor.signatureUrl || undefined,
      },
      patient: {
        name: `${prescription.patient.firstName} ${prescription.patient.lastName}`,
        phoneNumber: prescription.patient.phoneNumber,
        email: prescription.patient.email || undefined,
        gender: prescription.patient.gender || undefined,
        age: patientAge ?? undefined,
        patientId: prescription.patient.id.slice(0, 8).toUpperCase(),
      },
      medications: prescription.medications.map((med) => ({
        name: med.name,
        dosage: med.dosage,
        route: med.route || 'PO',
        frequency: med.frequency,
        duration: med.duration,
      })),
      instructions: prescription.instructions || undefined,
      date: new Date(prescription.createdAt),
      validityDays: 30,
    });
  }
}
