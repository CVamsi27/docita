import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import {
  Specialization,
  HospitalRole,
  Role,
  UploadSessionPurpose,
} from '@workspace/db';
import {
  DOCTOR_LIST_SELECT,
  DOCTOR_CARD_SELECT,
} from '@/common/select-fragments';
import { DoctorVerificationService } from './doctor-verification.service';
import { StoredFileUrlResolverService } from '@/domains/documents/application/services/stored-file-url-resolver.service';

interface CreateDoctorData {
  email: string;
  password: string;
  name: string;
  role?: string;
  specialization?: Specialization;
  hospitalRole?: HospitalRole;
  qualification?: string;
  registrationNumber?: string;
  licenseNumber?: string;
  phoneNumber?: string;
  bio?: string;
  yearsOfExperience?: number;
  consultationFee?: number;
}

interface UpdateDoctorData {
  name?: string;
  email?: string;
  specialization?: Specialization;
  hospitalRole?: HospitalRole;
  qualification?: string;
  registrationNumber?: string;
  licenseNumber?: string;
  licenseExpiry?: Date;
  signatureUrl?: string;
  profilePhotoUrl?: string;
  phoneNumber?: string;
  bio?: string;
  yearsOfExperience?: number;
  consultationFee?: number;
  role?: string;
}

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

function normalizeRole(role: string | undefined): Role {
  if (!role) {
    return Role.DOCTOR;
  }

  return Object.values(Role).includes(role as Role)
    ? (role as Role)
    : Role.DOCTOR;
}

@Injectable()
export class DoctorsService {
  constructor(
    private prisma: PrismaService,
    private doctorVerificationService: DoctorVerificationService,
    private readonly storedFileUrlResolver: StoredFileUrlResolverService,
  ) {}

  private async resolveDoctorSignatureUrl<
    T extends { signatureUrl?: string | null },
  >(
    doctor: T,
  ): Promise<
    T & { signatureUrl?: string | null; signatureStoredUrl?: string | null }
  > {
    const resolved = await this.storedFileUrlResolver.resolveWithStoredUrl(
      doctor.signatureUrl ?? null,
    );

    return {
      ...doctor,
      signatureUrl: resolved.url ?? undefined,
      signatureStoredUrl: resolved.storedUrl ?? undefined,
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
    const user = await this.prisma.user.findUnique({
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

  async create(clinicId: string, data: CreateDoctorData) {
    const {
      email,
      password,
      name,
      role = 'DOCTOR',
      specialization,
      hospitalRole,
      qualification,
      registrationNumber,
      licenseNumber,
      phoneNumber,
      bio,
      yearsOfExperience,
      consultationFee,
    } = data;

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        clinicId,
        role: normalizeRole(role),
        specialization,
        hospitalRole,
        qualification,
        registrationNumber,
        licenseNumber,
        phoneNumber,
        bio,
        yearsOfExperience,
        consultationFee,
      },
    });

    await this.prisma.doctorClinic.create({
      data: {
        doctorId: user.id,
        clinicId,
        role,
      },
    });

    if (specialization) {
      await this.prisma.doctorSpecialization.create({
        data: {
          doctorId: user.id,
          specialization,
          isPrimary: true,
        },
      });
    }

    await this.doctorVerificationService.verifyAndPersistDoctorVerification(
      user.id,
    );

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      specialization: user.specialization,
      hospitalRole: user.hospitalRole,
      qualification: user.qualification,
    };
  }

  async update(id: string, data: UpdateDoctorData, clinicId?: string) {
    if (clinicId) await this.findOne(id, clinicId);
    const {
      name,
      email,
      specialization,
      hospitalRole,
      qualification,
      registrationNumber,
      licenseNumber,
      licenseExpiry,
      signatureUrl,
      profilePhotoUrl,
      phoneNumber,
      bio,
      yearsOfExperience,
      consultationFee,
      role,
    } = data;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (specialization !== undefined)
      updateData.specialization = specialization;
    if (hospitalRole !== undefined) updateData.hospitalRole = hospitalRole;
    if (qualification !== undefined) updateData.qualification = qualification;
    if (registrationNumber !== undefined)
      updateData.registrationNumber = registrationNumber;
    if (licenseNumber !== undefined) updateData.licenseNumber = licenseNumber;
    if (licenseExpiry !== undefined) updateData.licenseExpiry = licenseExpiry;
    if (signatureUrl !== undefined) {
      updateData.signatureUrl = signatureUrl;
      updateData.signatureUploadedAt = signatureUrl ? new Date() : null;
    }
    if (profilePhotoUrl !== undefined)
      updateData.profilePhotoUrl = profilePhotoUrl;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    if (bio !== undefined) updateData.bio = bio;
    if (yearsOfExperience !== undefined)
      updateData.yearsOfExperience = yearsOfExperience;
    if (consultationFee !== undefined)
      updateData.consultationFee = consultationFee;

    const user = await this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        specialization: true,
        hospitalRole: true,
        qualification: true,
        registrationNumber: true,
        licenseNumber: true,
        signatureUrl: true,
        signatureUploadedAt: true,
        verificationStatus: true,
        verificationSource: true,
        verificationRef: true,
        verificationReason: true,
        verificationData: true,
        verificationCheckedAt: true,
        profilePhotoUrl: true,
        bio: true,
        yearsOfExperience: true,
        consultationFee: true,
      },
    });

    if (
      registrationNumber !== undefined ||
      licenseNumber !== undefined ||
      name !== undefined
    ) {
      await this.doctorVerificationService.verifyAndPersistDoctorVerification(
        id,
      );
      return this.findOne(id, clinicId);
    }

    if (role) {
      await this.prisma.doctorClinic.updateMany({
        where: { doctorId: id },
        data: { role },
      });
    }

    return this.resolveDoctorSignatureUrl(user);
  }

  async createSignatureUploadSession(id: string, clinicId?: string) {
    if (clinicId) await this.findOne(id, clinicId);

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    return this.prisma.uploadSession.create({
      data: {
        expiresAt,
        purpose: UploadSessionPurpose.DOCTOR_SIGNATURE,
        doctorId: id,
      },
    });
  }

  async reverifyDoctor(id: string, clinicId?: string) {
    if (clinicId) await this.findOne(id, clinicId);
    return this.doctorVerificationService.verifyAndPersistDoctorVerification(
      id,
    );
  }

  async remove(id: string, clinicId?: string) {
    if (clinicId) await this.findOne(id, clinicId);

    await this.prisma.doctorEducation.deleteMany({
      where: { doctorId: id },
    });
    await this.prisma.doctorCertification.deleteMany({
      where: { doctorId: id },
    });
    await this.prisma.doctorSpecialization.deleteMany({
      where: { doctorId: id },
    });
    await this.prisma.doctorClinic.deleteMany({
      where: { doctorId: id },
    });

    await this.prisma.user.delete({
      where: { id },
    });

    return { success: true };
  }

  async addEducation(doctorId: string, data: CreateEducationData) {
    return this.prisma.doctorEducation.create({
      data: {
        doctorId,
        ...data,
      },
    });
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
    await this.prisma.doctorEducation.delete({
      where: { id: educationId },
    });
    return { success: true };
  }

  async getEducationHistory(doctorId: string) {
    return this.prisma.doctorEducation.findMany({
      where: { doctorId },
      orderBy: { order: 'asc' },
    });
  }

  async addCertification(doctorId: string, data: CreateCertificationData) {
    return this.prisma.doctorCertification.create({
      data: {
        doctorId,
        ...data,
      },
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

  async getCertifications(doctorId: string) {
    return this.prisma.doctorCertification.findMany({
      where: { doctorId },
      orderBy: { issueDate: 'desc' },
    });
  }

  async addSpecialization(
    doctorId: string,
    specialization: Specialization,
    yearsOfPractice?: number,
  ) {
    return this.prisma.doctorSpecialization.create({
      data: {
        doctorId,
        specialization,
        yearsOfPractice,
      },
    });
  }

  async removeSpecialization(doctorId: string, specialization: Specialization) {
    await this.prisma.doctorSpecialization.delete({
      where: {
        doctorId_specialization: {
          doctorId,
          specialization,
        },
      },
    });
    return { success: true };
  }

  async getSpecializations(doctorId: string) {
    return this.prisma.doctorSpecialization.findMany({
      where: { doctorId },
    });
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
