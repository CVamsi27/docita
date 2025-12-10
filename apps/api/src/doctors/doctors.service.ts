import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Specialization, HospitalRole, Role } from '@workspace/db';

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

@Injectable()
export class DoctorsService {
  constructor(private prisma: PrismaService) {}

  async findAll(clinicId: string) {
    // Fetch all clinic staff including doctors from doctorClinic and direct clinic users
    const [doctorClinics, clinicUsers] = await Promise.all([
      this.prisma.doctorClinic.findMany({
        where: { clinicId },
        include: {
          doctor: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              specialization: true,
              hospitalRole: true,
              qualification: true,
              registrationNumber: true,
              profilePhotoUrl: true,
              yearsOfExperience: true,
              consultationFee: true,
              createdAt: true,
            },
          },
        },
      }),
      // Also fetch users directly assigned to clinic (admins, receptionists created with clinic)
      this.prisma.user.findMany({
        where: { clinicId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          specialization: true,
          hospitalRole: true,
          qualification: true,
          registrationNumber: true,
          profilePhotoUrl: true,
          yearsOfExperience: true,
          consultationFee: true,
          createdAt: true,
        },
      }),
    ]);

    // Combine both lists, avoiding duplicates (users that appear in both)
    const doctorClinicIds = new Set(doctorClinics.map((dc) => dc.doctor.id));
    const directUsers = clinicUsers.filter((u) => !doctorClinicIds.has(u.id));

    const allUsers = [
      ...doctorClinics.map((dc) => ({
        id: dc.doctor.id,
        email: dc.doctor.email,
        name: dc.doctor.name,
        role: dc.doctor.role,
        specialization: dc.doctor.specialization,
        hospitalRole: dc.doctor.hospitalRole,
        qualification: dc.doctor.qualification,
        registrationNumber: dc.doctor.registrationNumber,
        profilePhotoUrl: dc.doctor.profilePhotoUrl,
        yearsOfExperience: dc.doctor.yearsOfExperience,
        consultationFee: dc.doctor.consultationFee,
        createdAt: dc.doctor.createdAt,
      })),
      ...directUsers.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        specialization: u.specialization,
        hospitalRole: u.hospitalRole,
        qualification: u.qualification,
        registrationNumber: u.registrationNumber,
        profilePhotoUrl: u.profilePhotoUrl,
        yearsOfExperience: u.yearsOfExperience,
        consultationFee: u.consultationFee,
        createdAt: u.createdAt,
      })),
    ];

    return allUsers;
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
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
        licenseNumber: true,
        licenseExpiry: true,
        signatureUrl: true,
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

    return user;
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
        role: (role as unknown as Role) || 'DOCTOR',
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

    // If specialization is set, also add to additional specializations as primary
    if (specialization) {
      await this.prisma.doctorSpecialization.create({
        data: {
          doctorId: user.id,
          specialization,
          isPrimary: true,
        },
      });
    }

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

  async update(id: string, data: UpdateDoctorData) {
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
    if (signatureUrl !== undefined) updateData.signatureUrl = signatureUrl;
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
        profilePhotoUrl: true,
        bio: true,
        yearsOfExperience: true,
        consultationFee: true,
      },
    });

    if (role) {
      await this.prisma.doctorClinic.updateMany({
        where: { doctorId: id },
        data: { role },
      });
    }

    return user;
  }

  async remove(id: string) {
    // Delete related records first
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

  // ============================================================================
  // Education Management
  // ============================================================================

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
  ) {
    return this.prisma.doctorEducation.update({
      where: { id: educationId },
      data,
    });
  }

  async removeEducation(educationId: string) {
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

  // ============================================================================
  // Certification Management
  // ============================================================================

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
  ) {
    return this.prisma.doctorCertification.update({
      where: { id: certificationId },
      data,
    });
  }

  async removeCertification(certificationId: string) {
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

  // ============================================================================
  // Additional Specializations Management
  // ============================================================================

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

  // ============================================================================
  // Get All Available Specializations
  // ============================================================================

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
