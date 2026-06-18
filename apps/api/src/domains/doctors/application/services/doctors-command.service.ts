import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Role, Specialization } from '@workspace/db';
import {
  DOCTOR_REPOSITORY_TOKEN,
  IDoctorRepository,
} from '@/domains/doctors/core/repositories/doctor.repository.interface';
import { DoctorVerificationService } from './doctor-verification.service';
import { SignatureUploadService } from './signature-upload.service';
import { StoredFileUrlResolverService } from '@/domains/documents/application/services/stored-file-url-resolver.service';
import {
  StorageProvider,
  StorageFile,
} from '@/domains/documents/application/ports/storage-provider.port';
import { DoctorsQueryService } from './doctors-query.service';
import {
  DoctorProfileService,
  type CreateCertificationData,
  type CreateEducationData,
} from './doctor-profile.service';
import { DoctorAdminVerificationCommandService } from './doctor-admin-verification-command.service';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { parseStringEnumMember } from '@workspace/utils';

const PRISMA_ROLE_MEMBERS = Object.values(Role);

interface CreateDoctorData {
  email: string;
  password: string;
  name: string;
  role?: string;
  specialization?: Specialization;
  hospitalRole?: import('@workspace/db').HospitalRole;
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
  hospitalRole?: import('@workspace/db').HospitalRole;
  qualification?: string;
  registrationNumber?: string;
  registrationCouncil?: string | null;
  registrationStateCode?: string | null;
  hprId?: string;
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

function normalizeRole(role: string | undefined): Role {
  if (!role) return Role.DOCTOR;
  return parseStringEnumMember(PRISMA_ROLE_MEMBERS, role) ?? Role.DOCTOR;
}

/**
 * Handles doctor account mutations: create, update, remove, signature uploads, and reverification.
 * Platform-admin approve/reject decisions are delegated to DoctorAdminVerificationCommandService.
 */
@Injectable()
export class DoctorsCommandService {
  constructor(
    @Inject(DOCTOR_REPOSITORY_TOKEN)
    private readonly doctorRepository: IDoctorRepository,
    private readonly doctorVerificationService: DoctorVerificationService,
    private readonly signatureUploadService: SignatureUploadService,
    private readonly storedFileUrlResolver: StoredFileUrlResolverService,
    private readonly storageProvider: StorageProvider,
    private readonly queryService: DoctorsQueryService,
    private readonly profileService: DoctorProfileService,
    private readonly adminVerificationService: DoctorAdminVerificationCommandService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

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
    const created = await this.doctorRepository.createDoctorWithClinic(
      {
        email,
        hashedPassword,
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
      { doctorId: '', clinicId, role },
      specialization,
    );

    await this.doctorVerificationService.verifyAndPersistDoctorVerification(
      created.id,
    );

    return created;
  }

  async update(id: string, data: UpdateDoctorData, clinicId?: string) {
    if (clinicId) await this.queryService.findOne(id, clinicId);
    const {
      name,
      email,
      specialization,
      hospitalRole,
      qualification,
      registrationNumber,
      registrationCouncil,
      registrationStateCode,
      hprId,
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
    if (registrationCouncil !== undefined)
      updateData.registrationCouncil = registrationCouncil;
    if (registrationStateCode !== undefined)
      updateData.registrationStateCode = registrationStateCode;
    if (hprId !== undefined) updateData.hprId = hprId.trim() || null;
    if (licenseNumber !== undefined) updateData.licenseNumber = licenseNumber;
    if (licenseExpiry !== undefined) updateData.licenseExpiry = licenseExpiry;
    if (signatureUrl !== undefined) {
      updateData.signatureUrl = signatureUrl;
      updateData.signatureUploadedAt = signatureUrl ? this.clock.now() : null;
    }
    if (profilePhotoUrl !== undefined)
      updateData.profilePhotoUrl = profilePhotoUrl;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    if (bio !== undefined) updateData.bio = bio;
    if (yearsOfExperience !== undefined)
      updateData.yearsOfExperience = yearsOfExperience;
    if (consultationFee !== undefined)
      updateData.consultationFee = consultationFee;

    const updatedCount = await this.doctorRepository.updateDoctorProfile(
      id,
      updateData,
    );
    if (updatedCount === 0) {
      throw new NotFoundException(`Doctor with ID ${id} not found`);
    }

    const user = await this.doctorRepository.findDoctorForResponse(id);
    if (!user) {
      throw new NotFoundException(`Doctor with ID ${id} not found`);
    }

    if (
      registrationNumber !== undefined ||
      registrationCouncil !== undefined ||
      registrationStateCode !== undefined ||
      licenseNumber !== undefined ||
      name !== undefined
    ) {
      await this.doctorVerificationService.verifyAndPersistDoctorVerification(
        id,
      );
      return this.queryService.findOne(id, clinicId);
    }

    if (role) {
      await this.doctorRepository.updateDoctorClinicRole(id, role);
    }

    return this.queryService.resolveDoctorSignatureUrl(user);
  }

  async createSignatureUploadSession(id: string, clinicId?: string) {
    if (clinicId) await this.queryService.findOne(id, clinicId);
    return this.signatureUploadService.generateUploadToken(id);
  }

  async reverifyDoctor(id: string, clinicId?: string) {
    if (clinicId) await this.queryService.findOne(id, clinicId);
    return this.doctorVerificationService.verifyAndPersistDoctorVerification(
      id,
    );
  }

  adminVerifyDoctor(doctorId: string, adminId: string, note?: string) {
    return this.adminVerificationService.adminVerifyDoctor(
      doctorId,
      adminId,
      note,
    );
  }

  adminRejectDoctor(doctorId: string, adminId: string, reason: string) {
    return this.adminVerificationService.adminRejectDoctor(
      doctorId,
      adminId,
      reason,
    );
  }

  uploadRegistrationCertificate(doctorId: string, file: StorageFile) {
    return this.profileService.uploadRegistrationCertificate(doctorId, file);
  }

  async remove(id: string, clinicId?: string) {
    if (clinicId) await this.queryService.findOne(id, clinicId);

    const deletedCount = await this.doctorRepository.deleteDoctorCascading(id);
    if (deletedCount === 0) {
      throw new NotFoundException(`Doctor with ID ${id} not found`);
    }

    return { success: true };
  }

  addEducation(doctorId: string, data: CreateEducationData) {
    return this.profileService.addEducation(doctorId, data);
  }

  updateEducation(
    educationId: string,
    data: Partial<CreateEducationData>,
    doctorId?: string,
  ) {
    return this.profileService.updateEducation(educationId, data, doctorId);
  }

  removeEducation(educationId: string, doctorId?: string) {
    return this.profileService.removeEducation(educationId, doctorId);
  }

  addCertification(doctorId: string, data: CreateCertificationData) {
    return this.profileService.addCertification(doctorId, data);
  }

  updateCertification(
    certificationId: string,
    data: Partial<CreateCertificationData>,
    doctorId?: string,
  ) {
    return this.profileService.updateCertification(
      certificationId,
      data,
      doctorId,
    );
  }

  removeCertification(certificationId: string, doctorId?: string) {
    return this.profileService.removeCertification(certificationId, doctorId);
  }

  addSpecialization(
    doctorId: string,
    specialization: Specialization,
    yearsOfPractice?: number,
  ) {
    return this.profileService.addSpecialization(
      doctorId,
      specialization,
      yearsOfPractice,
    );
  }

  removeSpecialization(doctorId: string, specialization: Specialization) {
    return this.profileService.removeSpecialization(doctorId, specialization);
  }
}
