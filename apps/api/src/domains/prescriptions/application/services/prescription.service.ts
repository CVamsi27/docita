import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import {
  IPrescriptionRepository,
  PrescriptionDetail,
} from '@/domains/prescriptions/core/repositories/prescription.repository.interface';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrescriptionCreatedEvent } from '@/domains/prescriptions/core/events/prescription-created.event';
import { UsageTrackingService } from '@/domains/billing/core/services/usage-tracking.service';
import {
  DEFAULT_LOCALE,
  checkPrescriptionAllergies,
  validateDosage,
} from '@workspace/utils';
import {
  Specialization,
  HospitalRole,
  type EnqueuePdfJobResponse,
} from '@workspace/types';
import { DosageForm, SigCode } from '@workspace/db';
import { PrescriptionPdfOrchestratorService } from './prescription-pdf-orchestrator.service';

@Injectable()
export class PrescriptionsService {
  private readonly logger = new Logger(PrescriptionsService.name);

  constructor(
    @Inject('IPrescriptionRepository')
    private readonly repository: IPrescriptionRepository,
    private eventEmitter: EventEmitter2,
    private usageTracking: UsageTrackingService,
    private readonly pdfOrchestrator: PrescriptionPdfOrchestratorService,
  ) {}

  async findAll(
    clinicId: string,
    params?: {
      search?: string;
      date?: string;
      startDate?: string;
      endDate?: string;
      patientId?: string;
      limit?: number;
    },
  ) {
    return this.repository.findAll({
      clinicId,
      ...params,
    });
  }

  async findOne(id: string, clinicId: string): Promise<PrescriptionDetail> {
    const prescription = await this.repository.findById(id, clinicId);

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
      ndcCode?: string;
      rxNormCui?: string;
      dosageForm?: string;
      strengthValue?: number;
      strengthUnit?: string;
      sigCode?: string;
      quantity?: number;
      refillsAllowed?: number;
      dispenseAsWritten?: boolean;
      startDate?: string | Date;
      endDate?: string | Date;
      isPRN?: boolean;
      prnInstructions?: string;
      prnMaxDose?: string;
      specialInstructions?: string;
      indication?: string;
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
    const doctorProfile = await this.repository.findDoctorCompliance(
      data.doctorId,
      data.clinicId,
    );

    if (!doctorProfile) {
      throw new NotFoundException(
        `Doctor with ID ${data.doctorId} not found for this clinic`,
      );
    }

    if (!doctorProfile.signatureUrl) {
      throw new BadRequestException({
        message:
          'Prescription blocked: doctor digital signature is required before issuing prescriptions',
        code: 'DOCTOR_SIGNATURE_REQUIRED',
      });
    }

    if (doctorProfile.verificationStatus !== 'VERIFIED') {
      throw new BadRequestException({
        message:
          'Prescription blocked: doctor registration is not verified with government records',
        code: 'DOCTOR_VERIFICATION_REQUIRED',
        verificationStatus: doctorProfile.verificationStatus,
      });
    }

    if (!data.clinicId) {
      throw new BadRequestException(
        'Cannot create prescription without a clinic context',
      );
    }

    const patient = await this.repository.findPatientWithAllergies(
      data.patientId,
      data.clinicId,
    );

    if (!patient) {
      throw new NotFoundException(
        `Patient with ID ${data.patientId} not found`,
      );
    }

    const patientAllergies = patient.patientAllergies || [];
    if (patientAllergies.length > 0) {
      const allergyCheck = checkPrescriptionAllergies(
        data.medications,
        patientAllergies,
      );

      if (allergyCheck.criticalWarnings.length > 0) {
        throw new BadRequestException({
          message: 'Cannot prescribe medications due to critical allergies',
          allergies: allergyCheck.criticalWarnings,
          medicationChecks: allergyCheck.medicationChecks,
        });
      }

      if (allergyCheck.allWarnings.length > 0) {
        this.logger.warn('Prescription created with allergy warnings', {
          warningCount: allergyCheck.allWarnings.length,
          medicationsChecked: data.medications.length,
        });
      }
    }

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
        this.logger.warn('Dosage warning detected', {
          severity: dosageValidation.severity,
          isValid: dosageValidation.isValid,
        });
      }
    }

    const prescription = await this.repository.create({
      appointment: { connect: { id: data.appointmentId } },
      patient: { connect: { id: data.patientId } },
      doctor: { connect: { id: data.doctorId } },
      instructions: data.instructions,
      doctorName: data.doctorName ?? doctorProfile.name,
      doctorEmail: data.doctorEmail ?? doctorProfile.email,
      doctorPhone: data.doctorPhone ?? doctorProfile.phoneNumber ?? undefined,
      doctorSpecialization: data.doctorSpecialization,
      doctorRole: data.doctorRole,
      doctorRegistrationNumber:
        data.doctorRegistrationNumber ??
        doctorProfile.registrationNumber ??
        undefined,
      doctorLicenseNumber:
        data.doctorLicenseNumber ?? doctorProfile.licenseNumber ?? undefined,
      medications: {
        create: data.medications.map((med) => ({
          name: med.name,
          dosage: med.dosage,
          frequency: med.frequency,
          duration: med.duration,
          route: med.route || 'PO',
          ndcCode: med.ndcCode,
          rxNormCui: med.rxNormCui,
          dosageForm: med.dosageForm as DosageForm | undefined,
          strengthValue: med.strengthValue,
          strengthUnit: med.strengthUnit,
          sigCode: med.sigCode as SigCode | undefined,
          quantity: med.quantity,
          refillsAllowed: med.refillsAllowed ?? 0,
          dispenseAsWritten: med.dispenseAsWritten ?? false,
          startDate: med.startDate ? new Date(med.startDate) : undefined,
          endDate: med.endDate ? new Date(med.endDate) : undefined,
          isPRN: med.isPRN ?? false,
          prnInstructions: med.prnInstructions,
          prnMaxDose: med.prnMaxDose,
          specialInstructions: med.specialInstructions,
          indication: med.indication,
        })),
      },
    });

    if (data.clinicId) {
      this.eventEmitter.emit(
        'prescription.created',
        new PrescriptionCreatedEvent(prescription.id, data.clinicId),
      );
      this.usageTracking
        .trackPrescription(data.clinicId, prescription.id)
        .catch((err) =>
          this.logger.warn('Failed to track prescription usage', err),
        );
    }

    return prescription;
  }

  async generatePDF(
    id: string,
    clinicIdOrTimezone: string,
    locale: string = DEFAULT_LOCALE,
  ): Promise<Buffer> {
    return this.pdfOrchestrator.generatePDF(id, clinicIdOrTimezone, locale);
  }

  async getPdf(
    id: string,
    clinicId: string,
  ): Promise<
    { type: 'url'; url: string } | { type: 'buffer'; buffer: Buffer }
  > {
    return this.pdfOrchestrator.getPdf(id, clinicId);
  }

  async generatePdfAsync(
    id: string,
    clinicId: string,
  ): Promise<EnqueuePdfJobResponse> {
    return this.pdfOrchestrator.generatePdfAsync(id, clinicId);
  }

  async uploadAndPersist(
    id: string,
    clinicId: string,
    buffer: Buffer,
    prescription: PrescriptionDetail,
  ): Promise<{ storedKey: string; generatedAt: Date }> {
    return this.pdfOrchestrator.uploadAndPersist(
      id,
      clinicId,
      buffer,
      prescription,
    );
  }
}
