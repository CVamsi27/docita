import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Role, DoctorVerificationStatus, Specialization } from '@workspace/db';
import { DoctorVerificationService } from './doctor-verification.service';
import { SignatureUploadService } from './signature-upload.service';
import { StoredFileUrlResolverService } from '@/domains/documents/application/services/stored-file-url-resolver.service';
import {
  StorageProvider,
  StorageFile,
} from '@/domains/documents/infrastructure/storage.provider';
import { DoctorsQueryService } from './doctors-query.service';
import { DoctorProfileService } from './doctor-profile.service';

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
  if (!role) return Role.DOCTOR;
  return Object.values(Role).includes(role as Role)
    ? (role as Role)
    : Role.DOCTOR;
}

@Injectable()
export class DoctorsCommandService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly doctorVerificationService: DoctorVerificationService,
    private readonly signatureUploadService: SignatureUploadService,
    private readonly storedFileUrlResolver: StoredFileUrlResolverService,
    private readonly storageProvider: StorageProvider,
    private readonly queryService: DoctorsQueryService,
    private readonly profileService: DoctorProfileService,
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

    const result = await this.prisma.user.updateMany({
      where: { id },
      data: updateData,
    });

    if (result.count === 0) {
      throw new NotFoundException(`Doctor with ID ${id} not found`);
    }

    const user = await this.prisma.user.findFirst({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        specialization: true,
        hospitalRole: true,
        qualification: true,
        registrationNumber: true,
        registrationCouncil: true,
        registrationStateCode: true,
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
      await this.prisma.doctorClinic.updateMany({
        where: { doctorId: id },
        data: { role },
      });
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

  async adminVerifyDoctor(doctorId: string, adminId: string, note?: string) {
    const doctor = await this.prisma.user.findUnique({
      where: { id: doctorId },
      select: { id: true, role: true, registrationNumber: true },
    });
    if (!doctor) throw new NotFoundException('Doctor not found');
    if (doctor.role !== Role.DOCTOR && doctor.role !== Role.ADMIN_DOCTOR) {
      throw new BadRequestException('Only doctor accounts can be verified');
    }
    if (!doctor.registrationNumber) {
      throw new BadRequestException(
        'Doctor must submit a registration number before verification',
      );
    }

    await this.prisma.user.update({
      where: { id: doctorId },
      data: {
        verificationStatus: DoctorVerificationStatus.VERIFIED,
        verificationSource: 'MANUAL_ADMIN',
        verificationReason: note?.trim() || null,
        verificationCheckedAt: new Date(),
        verifiedByAdminId: adminId,
        verifiedByAdminAt: new Date(),
      },
    });

    return this.queryService.findOne(doctorId);
  }

  async adminRejectDoctor(doctorId: string, adminId: string, reason: string) {
    const trimmed = reason?.trim();
    if (!trimmed) {
      throw new BadRequestException(
        'A rejection reason is required so the doctor knows what to fix',
      );
    }

    const doctor = await this.prisma.user.findUnique({
      where: { id: doctorId },
      select: { id: true, role: true },
    });
    if (!doctor) throw new NotFoundException('Doctor not found');
    if (doctor.role !== Role.DOCTOR && doctor.role !== Role.ADMIN_DOCTOR) {
      throw new BadRequestException('Only doctor accounts can be rejected');
    }

    await this.prisma.user.update({
      where: { id: doctorId },
      data: {
        verificationStatus: DoctorVerificationStatus.REJECTED,
        verificationSource: 'MANUAL_ADMIN',
        verificationReason: trimmed,
        verificationCheckedAt: new Date(),
        verifiedByAdminId: adminId,
        verifiedByAdminAt: new Date(),
      },
    });

    return this.queryService.findOne(doctorId);
  }

  uploadRegistrationCertificate(doctorId: string, file: StorageFile) {
    return this.profileService.uploadRegistrationCertificate(doctorId, file);
  }

  async remove(id: string, clinicId?: string) {
    if (clinicId) await this.queryService.findOne(id, clinicId);

    await this.prisma.doctorEducation.deleteMany({ where: { doctorId: id } });
    await this.prisma.doctorCertification.deleteMany({
      where: { doctorId: id },
    });
    await this.prisma.doctorSpecialization.deleteMany({
      where: { doctorId: id },
    });
    await this.prisma.doctorClinic.deleteMany({ where: { doctorId: id } });

    const result = await this.prisma.user.deleteMany({ where: { id } });

    if (result.count === 0) {
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
