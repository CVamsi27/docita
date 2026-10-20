import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import {
  DOCTOR_PERSISTENCE_PORT,
  type DoctorPersistencePort,
} from '@/domains/doctors/application/ports/doctor-persistence.port';
import { Role, HospitalRole } from '@workspace/db';
import {
  ACTIVE_SPECIALIZATIONS,
  type DoctorContractResponse,
} from '@workspace/types';

type OptionalDoctorResponseFields = Pick<
  DoctorContractResponse,
  | 'clinicId'
  | 'specialization'
  | 'hospitalRole'
  | 'qualification'
  | 'registrationNumber'
  | 'registrationCouncil'
  | 'registrationStateCode'
  | 'hprId'
  | 'licenseNumber'
  | 'licenseExpiry'
  | 'signatureUrl'
  | 'signatureUploadedAt'
  | 'verificationStatus'
  | 'verificationSource'
  | 'verificationRef'
  | 'verificationReason'
  | 'verificationCheckedAt'
  | 'profilePhotoUrl'
  | 'phoneNumber'
  | 'bio'
  | 'yearsOfExperience'
  | 'consultationFee'
  | 'registrationCertificateUrl'
>;
type NullableDoctorResponseFields = {
  [Field in keyof OptionalDoctorResponseFields]?:
    | OptionalDoctorResponseFields[Field]
    | null;
};
import {
  DOCTOR_LIST_SELECT,
  DOCTOR_CARD_SELECT,
  DOCTOR_DETAIL_SELECT,
} from '@/shared/common/select-fragments';
import { StoredFileUrlResolverService } from '@/domains/documents/application/services/stored-file-url-resolver.service';
import {
  mapDoctorEducationResponse,
  mapDoctorCertificationResponse,
  mapDoctorSpecializationResponse,
} from './doctor-history-response';

@Injectable()
export class DoctorsQueryService {
  constructor(
    @Inject(DOCTOR_PERSISTENCE_PORT)
    private readonly persistence: DoctorPersistencePort,
    private readonly storedFileUrlResolver: StoredFileUrlResolverService,
  ) {}

  async resolveDoctorSignatureUrl<T extends NullableDoctorResponseFields>(
    doctor: T,
  ) {
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
      clinicId: doctor.clinicId ?? undefined,
      specialization: doctor.specialization ?? undefined,
      hospitalRole: doctor.hospitalRole ?? undefined,
      qualification: doctor.qualification ?? undefined,
      registrationNumber: doctor.registrationNumber ?? undefined,
      registrationCouncil: doctor.registrationCouncil ?? undefined,
      registrationStateCode: doctor.registrationStateCode ?? undefined,
      hprId: doctor.hprId ?? undefined,
      licenseNumber: doctor.licenseNumber ?? undefined,
      licenseExpiry: doctor.licenseExpiry ?? undefined,
      signatureUploadedAt: doctor.signatureUploadedAt ?? undefined,
      verificationStatus: doctor.verificationStatus ?? undefined,
      verificationSource: doctor.verificationSource ?? undefined,
      verificationRef: doctor.verificationRef ?? undefined,
      verificationReason: doctor.verificationReason ?? undefined,
      verificationCheckedAt: doctor.verificationCheckedAt ?? undefined,
      profilePhotoUrl: doctor.profilePhotoUrl ?? undefined,
      phoneNumber: doctor.phoneNumber ?? undefined,
      bio: doctor.bio ?? undefined,
      yearsOfExperience: doctor.yearsOfExperience ?? undefined,
      consultationFee: doctor.consultationFee ?? undefined,
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
    specialization?: DoctorContractResponse['specialization'] | null;
    hospitalRole?: DoctorContractResponse['hospitalRole'] | null;
    qualification?: string | null;
    registrationNumber?: string | null;
    registrationCouncil?: string | null;
    registrationStateCode?: string | null;
    hprId?: string | null;
    verificationStatus?: DoctorContractResponse['verificationStatus'] | null;
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

    return this.resolveDoctorSignatureUrl({
      ...user,
      educationHistory: user.educationHistory.map(mapDoctorEducationResponse),
      certifications: user.certifications.map(mapDoctorCertificationResponse),
      additionalSpecializations: user.additionalSpecializations.map(
        mapDoctorSpecializationResponse,
      ),
    });
  }

  async getEducationHistory(doctorId: string) {
    const entries = await this.persistence.doctorEducation.findMany({
      where: { doctorId },
      orderBy: { order: 'asc' },
    });
    return entries.map(mapDoctorEducationResponse);
  }

  async getCertifications(doctorId: string) {
    const entries = await this.persistence.doctorCertification.findMany({
      where: { doctorId },
      orderBy: { issueDate: 'desc' },
    });
    return entries.map(mapDoctorCertificationResponse);
  }

  async getSpecializations(doctorId: string) {
    const entries = await this.persistence.doctorSpecialization.findMany({
      where: { doctorId },
    });
    return entries.map(mapDoctorSpecializationResponse);
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
