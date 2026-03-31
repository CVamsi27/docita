import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { PrescriptionPdfService } from './prescription-pdf.service';
import {
  IPrescriptionRepository,
  PrescriptionDetail,
} from '@/domains/prescriptions/core/repositories/prescription.repository.interface';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrescriptionCreatedEvent } from '@/domains/prescriptions/core/events/prescription-created.event';
import { UsageTrackingService } from '@/domains/billing/core/services/usage-tracking.service';
import { StorageProvider } from '@/domains/documents/infrastructure/storage.provider';
import {
  calculateAge,
  DEFAULT_TIMEZONE as _DEFAULT_TIMEZONE,
  DEFAULT_LOCALE,
  checkPrescriptionAllergies,
  validateDosage,
} from '@workspace/utils';
import { Specialization, HospitalRole } from '@workspace/types';
import {
  Prescription as _Prescription,
  DosageForm,
  SigCode,
} from '@workspace/db';

const CURRENT_PDF_TEMPLATE_VERSION = 1;
const PDF_SIGNED_URL_TTL_SECONDS = 3600;

@Injectable()
export class PrescriptionsService {
  private readonly logger = new Logger(PrescriptionsService.name);

  constructor(
    @Inject('IPrescriptionRepository')
    private readonly repository: IPrescriptionRepository,
    private pdfService: PrescriptionPdfService,
    private eventEmitter: EventEmitter2,
    private usageTracking: UsageTrackingService,
    private readonly storageProvider: StorageProvider,
  ) {}

  async findAll(clinicId: string, params?: { search?: string; date?: string }) {
    return this.repository.findAll({
      clinicId,
      ...params,
    });
  }

  async findOne(id: string, clinicId?: string): Promise<PrescriptionDetail> {
    const prescription = await this.repository.findById(id);

    if (!prescription) {
      throw new NotFoundException(`Prescription with ID ${id} not found`);
    }

    if (clinicId && prescription.patient?.clinic?.id !== clinicId) {
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

    const patient = await this.repository.findPatientWithAllergies(
      data.patientId,
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
        this.logger.warn(
          `Prescription created with allergy warnings for patient ${data.patientId}:`,
          allergyCheck.allWarnings,
        );
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
    clinicIdOrTimezone?: string,
    _locale: string = DEFAULT_LOCALE,
  ): Promise<Buffer> {
    const isClinicId = clinicIdOrTimezone && !clinicIdOrTimezone.includes('/');
    const clinicId = isClinicId ? clinicIdOrTimezone : undefined;
    const prescription = await this.findOne(id, clinicId);

    const patientAge = calculateAge(prescription.patient.dateOfBirth);
    const clinic = prescription.patient.clinic;

    if (!clinic?.name) {
      throw new BadRequestException(
        'Clinic details are required to generate prescription PDF',
      );
    }
    if (!prescription.doctorName) {
      throw new BadRequestException(
        'Doctor details are required to generate prescription PDF',
      );
    }

    return this.pdfService.generate({
      prescriptionId: prescription.id.slice(0, 8).toUpperCase(),
      clinic: {
        name: clinic.name,
        address: clinic.address || undefined,
        phone: clinic.phoneNumber || undefined,
        email: clinic.email || undefined,
      },
      doctor: {
        name: prescription.doctorName,
        qualification: prescription.doctor?.qualification || undefined,
        registrationNumber: prescription.doctorRegistrationNumber || undefined,
        signatureUrl: prescription.doctor?.signatureUrl || undefined,
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
      date: new Date(),
      validityDays: 30,
    });
  }

  async getPdf(
    id: string,
    clinicId?: string,
  ): Promise<
    { type: 'url'; url: string } | { type: 'buffer'; buffer: Buffer }
  > {
    if (this.storageProvider.supportsSignedUrls) {
      const prescription = await this.findOne(id, clinicId);

      if (prescription.pdfUrl) {
        const url = await this.storageProvider.generateSignedUrl(
          prescription.pdfUrl,
          PDF_SIGNED_URL_TTL_SECONDS,
        );
        return { type: 'url', url };
      }

      const buffer = await this.generatePDF(id, clinicId);
      const objectKey = `pdfs/prescriptions/${id}.pdf`;
      const storedKey = await this.storageProvider.uploadBuffer(
        buffer,
        objectKey,
        'application/pdf',
      );

      await this.repository.update(id, {
        pdfUrl: storedKey,
        pdfGeneratedAt: new Date(),
        pdfTemplateVersion: CURRENT_PDF_TEMPLATE_VERSION,
      });

      const url = await this.storageProvider.generateSignedUrl(
        storedKey,
        PDF_SIGNED_URL_TTL_SECONDS,
      );
      return { type: 'url', url };
    }

    const buffer = await this.generatePDF(id, clinicId);
    return { type: 'buffer', buffer };
  }
}
