import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
  Inject,
} from '@nestjs/common';
import {
  IMedicalDocumentsRepository,
  MEDICAL_DOCUMENTS_REPOSITORY_TOKEN,
} from '@/domains/medical-documents/core/repositories/medical-documents.repository.interface';
import {
  MedicalDocumentStatus,
  MedicalDocumentType,
  Prisma,
} from '@workspace/db';
import {
  CLOCK_PORT,
  type IClock,
} from '@/shared/common/ports/clock.port';

/**
 * Thin facade — delegates medical document persistence to IMedicalDocumentsRepository.
 */
@Injectable()
export class MedicalDocumentsService {
  private readonly logger = new Logger(MedicalDocumentsService.name);

  constructor(
    @Inject(MEDICAL_DOCUMENTS_REPOSITORY_TOKEN)
    private readonly medicalDocumentsRepository: IMedicalDocumentsRepository,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  private toMedicalDocumentType(rawType: string): MedicalDocumentType {
    const normalized = rawType.trim().toUpperCase();
    const legacyAliases: Record<string, MedicalDocumentType> = {
      FIT_TO_WORK: MedicalDocumentType.FITNESS_CERTIFICATE,
    };

    if (legacyAliases[normalized]) {
      return legacyAliases[normalized];
    }

    if ((Object.values(MedicalDocumentType) as string[]).includes(normalized)) {
      return normalized as MedicalDocumentType;
    }
    throw new BadRequestException(
      `Unsupported medical document type: ${rawType}`,
    );
  }

  async create(data: {
    type: string;
    patientId: string;
    doctorId: string;
    clinicId: string;
    appointmentId?: string;
    title: string;
    content: Record<string, unknown>;
    validFrom?: string;
    validUntil?: string;
    pdfUrl?: string;
  }) {
    return this.medicalDocumentsRepository.create({
      type: this.toMedicalDocumentType(data.type),
      patient: { connect: { id: data.patientId } },
      doctor: { connect: { id: data.doctorId } },
      clinic: { connect: { id: data.clinicId } },
      ...(data.appointmentId && {
        appointment: { connect: { id: data.appointmentId } },
      }),
      title: data.title,
      content: data.content as Prisma.InputJsonValue,
      validFrom: data.validFrom ? new Date(data.validFrom) : null,
      validUntil: data.validUntil ? new Date(data.validUntil) : null,
      ...(data.pdfUrl ? { pdfUrl: data.pdfUrl } : {}),
      status: MedicalDocumentStatus.DRAFT,
    });
  }

  async findAllForPatient(clinicId: string, patientId: string) {
    return this.medicalDocumentsRepository.findAllForPatient(
      clinicId,
      patientId,
    );
  }

  async findOne(id: string, clinicId: string) {
    const doc = await this.medicalDocumentsRepository.findOne(id, clinicId);
    if (!doc) throw new NotFoundException('Medical document not found');
    return doc;
  }

  async update(
    id: string,
    clinicId: string,
    data: Partial<{
      title: string;
      content: Record<string, unknown>;
      validFrom: string;
      validUntil: string;
    }>,
  ) {
    await this.findOne(id, clinicId);
    return this.medicalDocumentsRepository.update(id, {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.content !== undefined && {
        content: data.content as Prisma.InputJsonValue,
      }),
      ...(data.validFrom !== undefined && {
        validFrom: data.validFrom ? new Date(data.validFrom) : null,
      }),
      ...(data.validUntil !== undefined && {
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
      }),
    });
  }

  async sign(id: string, clinicId: string) {
    const doc = await this.findOne(id, clinicId);
    if (doc.status === MedicalDocumentStatus.REVOKED) {
      throw new ForbiddenException('Cannot sign a revoked document');
    }
    return this.medicalDocumentsRepository.update(id, {
      status: MedicalDocumentStatus.SIGNED,
      signedAt: this.clock.now(),
    });
  }

  async revoke(id: string, clinicId: string) {
    await this.findOne(id, clinicId);
    return this.medicalDocumentsRepository.update(id, {
      status: MedicalDocumentStatus.REVOKED,
    });
  }

  async delete(id: string, clinicId: string) {
    await this.findOne(id, clinicId);
    return this.medicalDocumentsRepository.delete(id);
  }
}
