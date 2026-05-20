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
import { StorageProvider } from '@/domains/documents/application/ports/storage-provider.port';
import { calculateAge, DEFAULT_LOCALE } from '@workspace/utils';
import { type EnqueuePdfJobResponse, extractPdfTheme } from '@workspace/types';
import { StoredFileUrlResolverService } from '@/domains/documents/application/services/stored-file-url-resolver.service';
import { PdfJobService } from '@/shared/modules/queue/pdf-job.service';
import type { PdfJobServicePort } from '@/shared/modules/queue/pdf-job.service';
import {
  CLOCK_PORT,
  type IClock,
} from '@/shared/common/ports/clock.port';

const CURRENT_PDF_TEMPLATE_VERSION = 1;
const PDF_SIGNED_URL_TTL_SECONDS = 3600;

@Injectable()
export class PrescriptionPdfOrchestratorService {
  private readonly logger = new Logger(PrescriptionPdfOrchestratorService.name);

  constructor(
    @Inject('IPrescriptionRepository')
    private readonly repository: IPrescriptionRepository,
    private pdfService: PrescriptionPdfService,
    private readonly storageProvider: StorageProvider,
    @Inject(StoredFileUrlResolverService)
    private readonly storedFileUrlResolver: Pick<
      StoredFileUrlResolverService,
      'resolveWithStoredUrl'
    >,
    @Inject(PdfJobService)
    private readonly pdfJobService: PdfJobServicePort,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async generatePDF(
    id: string,
    clinicIdOrTimezone: string,
    _locale: string = DEFAULT_LOCALE,
  ): Promise<Buffer> {
    const isClinicId = !clinicIdOrTimezone.includes('/');
    if (!isClinicId) {
      throw new BadRequestException(
        'Prescription PDF generation requires a clinic context',
      );
    }
    const clinicId = clinicIdOrTimezone;
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

    const diagnoses = prescription.appointment?.diagnoses
      ?.filter(
        (
          d,
        ): d is (typeof d & { icdCode: NonNullable<(typeof d)['icdCode']> }) =>
          d.icdCode != null,
      )
      .map((d) => ({
        icdCode: d.icdCode.code,
        description: d.icdCode.description,
        version: d.icdCode.version,
        isPrimary: d.isPrimary,
      }));

    const resolvedDoctorSignature = prescription.doctor?.signatureUrl
      ? ((
          await this.storedFileUrlResolver.resolveWithStoredUrl(
            prescription.doctor.signatureUrl,
          )
        ).url ?? undefined)
      : undefined;

    return this.pdfService.generate({
      prescriptionId: prescription.id.slice(0, 8).toUpperCase(),
      clinic: {
        name: clinic.name,
        address: clinic.address || undefined,
        phone: clinic.phoneNumber || undefined,
        email: clinic.email || undefined,
        logo: clinic.logo || undefined,
        currency: clinic.currency || undefined,
        branding: extractPdfTheme(clinic.branding),
      },
      doctor: {
        name: prescription.doctorName,
        qualification: prescription.doctor?.qualification || undefined,
        registrationNumber: prescription.doctorRegistrationNumber || undefined,
        signatureUrl: resolvedDoctorSignature,
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
      diagnoses: diagnoses?.length ? diagnoses : undefined,
      instructions: prescription.instructions || undefined,
      date: this.clock.now(),
      validityDays: 30,
    });
  }

  async getPdf(
    id: string,
    clinicId: string,
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
      const { storedKey } = await this.uploadAndPersist(
        id,
        clinicId,
        buffer,
        prescription,
      );

      const url = await this.storageProvider.generateSignedUrl(
        storedKey,
        PDF_SIGNED_URL_TTL_SECONDS,
      );
      return { type: 'url', url };
    }

    const buffer = await this.generatePDF(id, clinicId);
    return { type: 'buffer', buffer };
  }

  async generatePdfAsync(
    id: string,
    clinicId: string,
  ): Promise<EnqueuePdfJobResponse> {
    return this.pdfJobService.enqueue(id, 'prescription', clinicId);
  }

  async uploadAndPersist(
    id: string,
    clinicId: string,
    buffer: Buffer,
    prescription: PrescriptionDetail,
  ): Promise<{ storedKey: string; generatedAt: Date }> {
    const objectKey = `pdfs/prescriptions/${id}.pdf`;
    const generatedAt = this.clock.now();
    const storedKey = await this.storageProvider.uploadBuffer(
      buffer,
      objectKey,
      'application/pdf',
      {
        metadata: {
          asset_type: 'prescription-pdf',
          resource_type: 'Prescription',
          resource_id: id,
          clinic_id: prescription.patient?.clinic?.id,
          doctor_id: prescription.doctor?.id,
          modified_at: generatedAt.toISOString(),
          modified_by: prescription.doctor?.id || 'system',
          auth_method: 'prescription-service',
        },
      },
    );

    await this.repository.update(
      id,
      {
        pdfUrl: storedKey,
        pdfGeneratedAt: generatedAt,
        pdfTemplateVersion: CURRENT_PDF_TEMPLATE_VERSION,
      },
      clinicId,
    );

    return { storedKey, generatedAt };
  }

  private async findOne(
    id: string,
    clinicId: string,
  ): Promise<PrescriptionDetail> {
    const prescription = await this.repository.findById(id, clinicId);
    if (!prescription) {
      throw new NotFoundException(`Prescription with ID ${id} not found`);
    }
    return prescription;
  }
}
