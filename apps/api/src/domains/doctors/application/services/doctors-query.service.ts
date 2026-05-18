import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Specialization, HospitalRole } from '@workspace/db';
import {
  DOCTOR_LIST_SELECT,
  DOCTOR_CARD_SELECT,
} from '@/common/select-fragments';
import { StoredFileUrlResolverService } from '@/domains/documents/application/services/stored-file-url-resolver.service';

@Injectable()
export class DoctorsQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storedFileUrlResolver: StoredFileUrlResolverService,
  ) {}

  async resolveDoctorSignatureUrl<
    T extends {
      signatureUrl?: string | null;
      registrationCertificateUrl?: string | null;
    },
  >(
    doctor: T,
  ): Promise<
    T & {
      signatureUrl?: string | null;
      signatureStoredUrl?: string | null;
      registrationCertificateUrl?: string | null;
      registrationCertificateStoredUrl?: string | null;
    }
  > {
    const [signature, certificate] = await Promise.all([
      this.storedFileUrlResolver.resolveWithStoredUrl(
        doctor.signatureUrl ?? null,
      ),
      this.storedFileUrlResolver.resolveWithStoredUrl(
        doctor.registrationCertificateUrl ?? null,
      ),
    ]);

    return {
      ...doctor,
      signatureUrl: signature.url ?? undefined,
      signatureStoredUrl: signature.storedUrl ?? undefined,
      registrationCertificateUrl: certificate.url ?? undefined,
      registrationCertificateStoredUrl: certificate.storedUrl ?? undefined,
    };
  }

  async findAll(clinicId: string) {
    const [doctorClinics, clinicUsers] = await Promise.all([
      this.prisma.doctorClinic.findMany({
        where: { clinicId },
        include: {
          doctor: {
            select: DOCTOR_CARD_SELECT,
          },
        },
      }),
      this.prisma.user.findMany({
        where: {
          clinicId,
          role: { in: ['DOCTOR', 'ADMIN_DOCTOR'] },
        },
        select: {
          ...DOCTOR_LIST_SELECT,
          registrationNumber: true,
          registrationCouncil: true,
          registrationStateCode: true,
          verificationStatus: true,
          verificationReason: true,
          verificationCheckedAt: true,
          signatureUrl: true,
          profilePhotoUrl: true,
          yearsOfExperience: true,
          consultationFee: true,
          createdAt: true,
        },
      }),
    ]);

    const doctorClinicIds = new Set(doctorClinics.map((dc) => dc.doctor.id));

    const validDoctorClinics = doctorClinics.filter(
      (dc) => dc.doctor.role === 'DOCTOR' || dc.doctor.role === 'ADMIN_DOCTOR',
    );

    const directUsers = clinicUsers.filter((u) => !doctorClinicIds.has(u.id));

    const mappedClinics = await Promise.all(
      validDoctorClinics.map(async (dc) => {
        const doctor = await this.resolveDoctorSignatureUrl(dc.doctor);
        return {
          id: doctor.id,
          role: doctor.role,
          email: doctor.email,
          name: doctor.name,
          specialization: doctor.specialization,
          hospitalRole: doctor.hospitalRole,
          qualification: doctor.qualification,
          registrationNumber: doctor.registrationNumber,
          registrationCouncil: doctor.registrationCouncil,
          registrationStateCode: doctor.registrationStateCode,
          verificationStatus: doctor.verificationStatus,
          verificationReason: doctor.verificationReason,
          verificationCheckedAt: doctor.verificationCheckedAt,
          signatureUrl: doctor.signatureUrl,
          signatureStoredUrl: doctor.signatureStoredUrl,
          profilePhotoUrl: doctor.profilePhotoUrl,
          yearsOfExperience: doctor.yearsOfExperience,
          consultationFee: doctor.consultationFee,
          createdAt: doctor.createdAt,
        };
      }),
    );

    const mappedDirectUsers = await Promise.all(
      directUsers.map(async (user) => {
        const doctor = await this.resolveDoctorSignatureUrl(user);
        return {
          id: doctor.id,
          role: doctor.role,
          email: doctor.email,
          name: doctor.name,
          specialization: doctor.specialization,
          hospitalRole: doctor.hospitalRole,
          qualification: doctor.qualification,
          registrationNumber: doctor.registrationNumber,
          registrationCouncil: doctor.registrationCouncil,
          registrationStateCode: doctor.registrationStateCode,
          verificationStatus: doctor.verificationStatus,
          verificationReason: doctor.verificationReason,
          verificationCheckedAt: doctor.verificationCheckedAt,
          signatureUrl: doctor.signatureUrl,
          signatureStoredUrl: doctor.signatureStoredUrl,
          profilePhotoUrl: doctor.profilePhotoUrl,
          yearsOfExperience: doctor.yearsOfExperience,
          consultationFee: doctor.consultationFee,
          createdAt: doctor.createdAt,
        };
      }),
    );

    return [...mappedClinics, ...mappedDirectUsers];
  }

  async findOne(id: string, clinicId?: string) {
    const user = await this.prisma.user.findFirst({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        clinicId: true,
        specialization: true,
        hospitalRole: true,
        qualification: true,
        registrationNumber: true,
        registrationCouncil: true,
        registrationStateCode: true,
        licenseNumber: true,
        licenseExpiry: true,
        signatureUrl: true,
        signatureUploadedAt: true,
        verificationStatus: true,
        verificationSource: true,
        verificationRef: true,
        verificationReason: true,
        verificationData: true,
        verificationCheckedAt: true,
        registrationCertificateUrl: true,
        verifiedByAdminId: true,
        verifiedByAdminAt: true,
        profilePhotoUrl: true,
        phoneNumber: true,
        bio: true,
        yearsOfExperience: true,
        consultationFee: true,
        createdAt: true,
        updatedAt: true,
        educationHistory: {
          orderBy: { order: 'asc' },
        },
        certifications: {
          orderBy: { issueDate: 'desc' },
        },
        additionalSpecializations: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`Doctor with ID ${id} not found`);
    }

    if (clinicId && user.clinicId !== clinicId) {
      const assignment = await this.prisma.doctorClinic.findFirst({
        where: { doctorId: id, clinicId, active: true },
      });
      if (!assignment) {
        throw new NotFoundException(`Doctor with ID ${id} not found`);
      }
    }

    return this.resolveDoctorSignatureUrl(user);
  }

  async getEducationHistory(doctorId: string) {
    return this.prisma.doctorEducation.findMany({
      where: { doctorId },
      orderBy: { order: 'asc' },
    });
  }

  async getCertifications(doctorId: string) {
    return this.prisma.doctorCertification.findMany({
      where: { doctorId },
      orderBy: { issueDate: 'desc' },
    });
  }

  async getSpecializations(doctorId: string) {
    return this.prisma.doctorSpecialization.findMany({
      where: { doctorId },
    });
  }

  async listDoctorsForAdminReview() {
    const { Role, DoctorVerificationStatus } = await import('@workspace/db');
    const doctors = await this.prisma.user.findMany({
      where: {
        role: { in: [Role.DOCTOR, Role.ADMIN_DOCTOR] },
        verificationStatus: {
          in: [
            DoctorVerificationStatus.PENDING,
            DoctorVerificationStatus.FAILED,
          ],
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        registrationNumber: true,
        registrationCouncil: true,
        registrationStateCode: true,
        registrationCertificateUrl: true,
        verificationStatus: true,
        verificationReason: true,
        verificationSource: true,
        verificationCheckedAt: true,
        clinic: { select: { id: true, name: true } },
      },
      orderBy: { verificationCheckedAt: 'asc' },
    });
    return doctors;
  }

  getAvailableSpecializations() {
    return Object.values(Specialization).map((spec: string) => ({
      value: spec,
      label: this.formatSpecializationLabel(spec),
    }));
  }

  getAvailableHospitalRoles() {
    return Object.values(HospitalRole).map((role: string) => ({
      value: role,
      label: this.formatHospitalRoleLabel(role),
    }));
  }

  private formatSpecializationLabel(spec: string): string {
    return spec
      .split('_')
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  }

  private formatHospitalRoleLabel(role: string): string {
    return role
      .split('_')
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  }
}
