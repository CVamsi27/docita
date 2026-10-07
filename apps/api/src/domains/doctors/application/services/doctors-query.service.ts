import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import {
  DOCTOR_PERSISTENCE_PORT,
  type DoctorPersistencePort,
} from '@/domains/doctors/application/ports/doctor-persistence.port';
import { Role, HospitalRole } from '@workspace/db';
import { ACTIVE_SPECIALIZATIONS } from '@workspace/types';
import {
  DOCTOR_LIST_SELECT,
  DOCTOR_CARD_SELECT,
  DOCTOR_DETAIL_SELECT,
} from '@/shared/common/select-fragments';
import { StoredFileUrlResolverService } from '@/domains/documents/application/services/stored-file-url-resolver.service';

@Injectable()
export class DoctorsQueryService {
  constructor(
    @Inject(DOCTOR_PERSISTENCE_PORT)
    private readonly persistence: DoctorPersistencePort,
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

  private async mapDoctorToResponse(input: {
    id: string;
    role: string;
    email: string;
    name: string | null;
    specialization?: string | null;
    hospitalRole?: string | null;
    qualification?: string | null;
    registrationNumber?: string | null;
    registrationCouncil?: string | null;
    registrationStateCode?: string | null;
    hprId?: string | null;
    verificationStatus?: string | null;
    verificationReason?: string | null;
    verificationCheckedAt?: Date | string | null;
    signatureUrl?: string | null;
    registrationCertificateUrl?: string | null;
    profilePhotoUrl?: string | null;
    yearsOfExperience?: number | null;
    consultationFee?: number | null;
    createdAt: Date | string;
  }) {
    const doctor = await this.resolveDoctorSignatureUrl(input);
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
      hprId: doctor.hprId,
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
  }

  async findAll(clinicId: string) {
    const [doctorClinics, clinicUsers] = await Promise.all([
      this.persistence.doctorClinic.findMany({
        // Public booking and staff pickers both read this list: a doctor whose
        // clinic link was deactivated no longer works here, and a soft-deleted
        // account is not a bookable practitioner. Listing either would expose
        // a departed/deleted doctor on the public booking page.
        where: {
          clinicId,
          active: true,
          doctor: { deletedAt: null },
        },
        include: {
          doctor: {
            select: DOCTOR_CARD_SELECT,
          },
        },
      }),
      this.persistence.user.findMany({
        where: {
          clinicId,
          role: { in: [Role.DOCTOR, Role.ADMIN_DOCTOR] },
          deletedAt: null,
        },
        select: {
          ...DOCTOR_LIST_SELECT,
          registrationNumber: true,
          registrationCouncil: true,
          registrationStateCode: true,
          hprId: true,
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
      (dc) =>
        dc.doctor.role === Role.DOCTOR || dc.doctor.role === Role.ADMIN_DOCTOR,
    );

    const directUsers = clinicUsers.filter((u) => !doctorClinicIds.has(u.id));

    const mappedClinics = await Promise.all(
      validDoctorClinics.map((dc) => this.mapDoctorToResponse(dc.doctor)),
    );

    const mappedDirectUsers = await Promise.all(
      directUsers.map((user) => this.mapDoctorToResponse(user)),
    );

    return [...mappedClinics, ...mappedDirectUsers];
  }

  async findOne(id: string, clinicId?: string) {
    const user = await this.persistence.user.findFirst({
      where: { id },
      select: {
        ...DOCTOR_DETAIL_SELECT,
        registrationCouncil: true,
        registrationStateCode: true,
        hprId: true,
        registrationCertificateUrl: true,
        verifiedByAdminId: true,
        verifiedByAdminAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`Doctor with ID ${id} not found`);
    }

    if (clinicId && user.clinicId !== clinicId) {
      const assignment = await this.persistence.doctorClinic.findFirst({
        where: { doctorId: id, clinicId, active: true },
      });
      if (!assignment) {
        throw new NotFoundException(`Doctor with ID ${id} not found`);
      }
    }

    return this.resolveDoctorSignatureUrl(user);
  }

  async getEducationHistory(doctorId: string) {
    return this.persistence.doctorEducation.findMany({
      where: { doctorId },
      orderBy: { order: 'asc' },
    });
  }

  async getCertifications(doctorId: string) {
    return this.persistence.doctorCertification.findMany({
      where: { doctorId },
      orderBy: { issueDate: 'desc' },
    });
  }

  async getSpecializations(doctorId: string) {
    return this.persistence.doctorSpecialization.findMany({
      where: { doctorId },
    });
  }

  async listDoctorsForAdminReview() {
    const { Role, DoctorVerificationStatus } = await import('@workspace/db');
    const doctors = await this.persistence.user.findMany({
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
    // Source the picker from the active set (packages/types), not the full
    // Prisma enum. The full enum still contains legacy Specialization values
    // kept for existing records (schema is additive-only); those must not be
    // offered as new selections. See merry-lobster audit G9.
    return ACTIVE_SPECIALIZATIONS.map((spec: string) => ({
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
