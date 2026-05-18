import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Role, DoctorVerificationStatus, Specialization } from '@workspace/db';
import { PrismaService } from '@/prisma/prisma.service';
import { StoredFileUrlResolverService } from '@/domains/documents/application/services/stored-file-url-resolver.service';
import {
  StorageProvider,
  StorageFile,
} from '@/domains/documents/infrastructure/storage.provider';

interface CreateEducationData {
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

interface CreateCertificationData {
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
    private readonly prisma: PrismaService,
    private readonly storedFileUrlResolver: StoredFileUrlResolverService,
    private readonly storageProvider: StorageProvider,
  ) {}

  async uploadRegistrationCertificate(doctorId: string, file: StorageFile) {
    const doctor = await this.prisma.user.findUnique({
      where: { id: doctorId },
      select: { id: true, role: true, verificationStatus: true },
    });
    if (!doctor) throw new NotFoundException('Doctor not found');
    if (doctor.role !== Role.DOCTOR && doctor.role !== Role.ADMIN_DOCTOR) {
      throw new BadRequestException(
        'Only doctor accounts can upload a registration certificate',
      );
    }

    const fileUrl = await this.storageProvider.upload(
      file,
      'registration-certificates',
      {
        metadata: {
          asset_type: 'registration_certificate',
          doctor_id: doctorId,
          modified_at: new Date().toISOString(),
          modified_by: doctorId,
        },
      },
    );

    const shouldRequeue =
      doctor.verificationStatus === DoctorVerificationStatus.REJECTED ||
      doctor.verificationStatus === DoctorVerificationStatus.FAILED ||
      doctor.verificationStatus === DoctorVerificationStatus.UNVERIFIED;

    await this.prisma.user.update({
      where: { id: doctorId },
      data: {
        registrationCertificateUrl: fileUrl,
        ...(shouldRequeue
          ? {
              verificationStatus: DoctorVerificationStatus.PENDING,
              verificationSource: 'MANUAL_ADMIN',
              verificationReason:
                'Certificate uploaded — pending admin review.',
              verificationCheckedAt: new Date(),
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

  async addEducation(doctorId: string, data: CreateEducationData) {
    return this.prisma.doctorEducation.create({ data: { doctorId, ...data } });
  }

  async updateEducation(
    educationId: string,
    data: Partial<CreateEducationData>,
    doctorId?: string,
  ) {
    if (doctorId) {
      const existing = await this.prisma.doctorEducation.findFirst({
        where: { id: educationId, doctorId },
      });
      if (!existing) throw new NotFoundException('Education record not found');
    }
    return this.prisma.doctorEducation.update({
      where: { id: educationId },
      data,
    });
  }

  async removeEducation(educationId: string, doctorId?: string) {
    if (doctorId) {
      const existing = await this.prisma.doctorEducation.findFirst({
        where: { id: educationId, doctorId },
      });
      if (!existing) throw new NotFoundException('Education record not found');
    }
    await this.prisma.doctorEducation.delete({ where: { id: educationId } });
    return { success: true };
  }

  async addCertification(doctorId: string, data: CreateCertificationData) {
    return this.prisma.doctorCertification.create({
      data: { doctorId, ...data },
    });
  }

  async updateCertification(
    certificationId: string,
    data: Partial<CreateCertificationData>,
    doctorId?: string,
  ) {
    if (doctorId) {
      const existing = await this.prisma.doctorCertification.findFirst({
        where: { id: certificationId, doctorId },
      });
      if (!existing)
        throw new NotFoundException('Certification record not found');
    }
    return this.prisma.doctorCertification.update({
      where: { id: certificationId },
      data,
    });
  }

  async removeCertification(certificationId: string, doctorId?: string) {
    if (doctorId) {
      const existing = await this.prisma.doctorCertification.findFirst({
        where: { id: certificationId, doctorId },
      });
      if (!existing)
        throw new NotFoundException('Certification record not found');
    }
    await this.prisma.doctorCertification.delete({
      where: { id: certificationId },
    });
    return { success: true };
  }

  async addSpecialization(
    doctorId: string,
    specialization: Specialization,
    yearsOfPractice?: number,
  ) {
    return this.prisma.doctorSpecialization.create({
      data: { doctorId, specialization, yearsOfPractice },
    });
  }

  async removeSpecialization(doctorId: string, specialization: Specialization) {
    await this.prisma.doctorSpecialization.delete({
      where: { doctorId_specialization: { doctorId, specialization } },
    });
    return { success: true };
  }
}
