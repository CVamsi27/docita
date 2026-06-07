import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { Role, DoctorVerificationStatus, Specialization } from '@workspace/db';
import {
  DOCTOR_PERSISTENCE_PORT,
  type DoctorPersistencePort,
} from '@/domains/doctors/application/ports/doctor-persistence.port';
import { StoredFileUrlResolverService } from '@/domains/documents/application/services/stored-file-url-resolver.service';
import {
  StorageProvider,
  StorageFile,
} from '@/domains/documents/application/ports/storage-provider.port';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';

export interface CreateEducationData {
  degree: string;
  fieldOfStudy?: string;
  institution: string;
  location?: string;
  startYear?: number;
  endYear?: number;
  isOngoing?: boolean;
  grade?: string;
  thesis?: string;
  order?: number;
}

export interface CreateCertificationData {
  name: string;
  issuingBody: string;
  issueDate: Date;
  expiryDate?: Date;
  credentialId?: string;
  credentialUrl?: string;
}

/**
 * Handles doctor profile sub-resources: education, certifications,
 * specializations, and registration certificate uploads.
 */
@Injectable()
export class DoctorProfileService {
  constructor(
    @Inject(DOCTOR_PERSISTENCE_PORT)
    private readonly persistence: DoctorPersistencePort,
    private readonly storedFileUrlResolver: StoredFileUrlResolverService,
    private readonly storageProvider: StorageProvider,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async uploadRegistrationCertificate(doctorId: string, file: StorageFile) {
    const doctor = await this.persistence.user.findUnique({
      where: { id: doctorId },
      select: { id: true, role: true, verificationStatus: true },
    });
    if (!doctor) throw new NotFoundException('Doctor not found');
    if (doctor.role !== Role.DOCTOR && doctor.role !== Role.ADMIN_DOCTOR)
      throw new BadRequestException(
        'Only doctor accounts can upload a registration certificate',
      );

    const fileUrl = await this.storageProvider.upload(
      file,
      'registration-certificates',
      {
        metadata: {
          asset_type: 'registration_certificate',
          doctor_id: doctorId,
          modified_at: this.clock.now().toISOString(),
          modified_by: doctorId,
        },
      },
    );

    const shouldRequeue =
      doctor.verificationStatus === DoctorVerificationStatus.REJECTED ||
      doctor.verificationStatus === DoctorVerificationStatus.FAILED ||
      doctor.verificationStatus === DoctorVerificationStatus.UNVERIFIED;

    await this.persistence.user.update({
      where: { id: doctorId },
      data: {
        registrationCertificateUrl: fileUrl,
        ...(shouldRequeue
          ? {
              verificationStatus: DoctorVerificationStatus.PENDING,
              verificationSource: 'MANUAL_ADMIN',
              verificationReason:
                'Certificate uploaded — pending admin review.',
              verificationCheckedAt: this.clock.now(),
              verifiedByAdminId: null,
              verifiedByAdminAt: null,
            }
          : {}),
      },
    });

    const resolved =
      await this.storedFileUrlResolver.resolveWithStoredUrl(fileUrl);
    return {
      success: true,
      registrationCertificateUrl: resolved.url ?? fileUrl,
      registrationCertificateStoredUrl: resolved.storedUrl ?? fileUrl,
    };
  }

  /**
   * Generic ownership guard: when `doctorId` is supplied, confirms `lookup`
   * resolves to a record before the caller's mutation proceeds. The two
   * resource-specific guards below each pin this to one persistence delegate
   * so call sites collapse to a single line instead of repeating the
   * find-then-throw shape per mutation.
   */
  private async assertOwnedByDoctor(
    lookup: () => Promise<unknown>,
    doctorId: string | undefined,
    notFoundMessage: string,
  ): Promise<void> {
    if (!doctorId) return;
    const existing = await lookup();
    if (!existing) throw new NotFoundException(notFoundMessage);
  }

  private assertEducationOwnedByDoctor(
    educationId: string,
    doctorId: string | undefined,
  ): Promise<void> {
    return this.assertOwnedByDoctor(
      () =>
        this.persistence.doctorEducation.findFirst({
          where: { id: educationId, doctorId },
        }),
      doctorId,
      'Education record not found',
    );
  }

  private assertCertificationOwnedByDoctor(
    certificationId: string,
    doctorId: string | undefined,
  ): Promise<void> {
    return this.assertOwnedByDoctor(
      () =>
        this.persistence.doctorCertification.findFirst({
          where: { id: certificationId, doctorId },
        }),
      doctorId,
      'Certification record not found',
    );
  }

  async addEducation(doctorId: string, data: CreateEducationData) {
    return this.persistence.doctorEducation.create({
      data: { doctorId, ...data },
    });
  }

  async updateEducation(
    educationId: string,
    data: Partial<CreateEducationData>,
    doctorId?: string,
  ) {
    await this.assertEducationOwnedByDoctor(educationId, doctorId);
    return this.persistence.doctorEducation.update({
      where: { id: educationId },
      data,
    });
  }

  async removeEducation(educationId: string, doctorId?: string) {
    await this.assertEducationOwnedByDoctor(educationId, doctorId);
    await this.persistence.doctorEducation.delete({
      where: { id: educationId },
    });
    return { success: true };
  }

  async addCertification(doctorId: string, data: CreateCertificationData) {
    return this.persistence.doctorCertification.create({
      data: { doctorId, ...data },
    });
  }

  async updateCertification(
    certificationId: string,
    data: Partial<CreateCertificationData>,
    doctorId?: string,
  ) {
    await this.assertCertificationOwnedByDoctor(certificationId, doctorId);
    return this.persistence.doctorCertification.update({
      where: { id: certificationId },
      data,
    });
  }

  async removeCertification(certificationId: string, doctorId?: string) {
    await this.assertCertificationOwnedByDoctor(certificationId, doctorId);
    await this.persistence.doctorCertification.delete({
      where: { id: certificationId },
    });
    return { success: true };
  }

  async addSpecialization(
    doctorId: string,
    specialization: Specialization,
    yearsOfPractice?: number,
  ) {
    return this.persistence.doctorSpecialization.create({
      data: { doctorId, specialization, yearsOfPractice },
    });
  }

  async removeSpecialization(doctorId: string, specialization: Specialization) {
    await this.persistence.doctorSpecialization.delete({
      where: { doctorId_specialization: { doctorId, specialization } },
    });
    return { success: true };
  }
}
