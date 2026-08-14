import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Role, Specialization } from '@workspace/db';
import { parseStringEnumMember, toCents } from '@workspace/utils';

const ROLE_VALUES = Object.values(Role);
import {
  CreateDoctorUserInput,
  CreatedDoctorUser,
  DoctorAfterUpdate,
  DoctorClinicLink,
  IDoctorRepository,
} from '@/domains/doctors/core/repositories/doctor.repository.interface';

@Injectable()
export class PrismaDoctorRepository implements IDoctorRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createDoctorWithClinic(
    user: CreateDoctorUserInput,
    link: DoctorClinicLink,
    primarySpecialization?: Specialization,
  ): Promise<CreatedDoctorUser> {
    const createdUser = await this.prisma.user.create({
      data: {
        email: user.email,
        password: user.hashedPassword,
        name: user.name,
        clinicId: user.clinicId,
        role: user.role,
        specialization: user.specialization,
        hospitalRole: user.hospitalRole,
        qualification: user.qualification,
        registrationNumber: user.registrationNumber,
        licenseNumber: user.licenseNumber,
        phoneNumber: user.phoneNumber,
        bio: user.bio,
        yearsOfExperience: user.yearsOfExperience,
        // Write both the legacy Float and the canonical cents column (G3).
        consultationFee: user.consultationFee,
        consultationFeeCents: toCents(user.consultationFee),
      },
    });

    const clinicRole = parseStringEnumMember(ROLE_VALUES, link.role);
    if (!clinicRole) {
      throw new Error(`Invalid doctor clinic role: ${link.role}`);
    }

    await this.prisma.doctorClinic.create({
      data: {
        doctorId: createdUser.id,
        clinicId: link.clinicId,
        role: clinicRole,
      },
    });

    if (primarySpecialization) {
      await this.prisma.doctorSpecialization.create({
        data: {
          doctorId: createdUser.id,
          specialization: primarySpecialization,
          isPrimary: true,
        },
      });
    }

    return {
      id: createdUser.id,
      email: createdUser.email,
      name: createdUser.name,
      role: createdUser.role,
      specialization: createdUser.specialization,
      hospitalRole: createdUser.hospitalRole,
      qualification: createdUser.qualification,
    };
  }

  async updateDoctorProfile(
    id: string,
    patch: Record<string, unknown>,
  ): Promise<number> {
    // Keep the canonical cents column in sync when the Float fee is updated (G3).
    const fee = patch.consultationFee;
    const data =
      fee !== undefined
        ? {
            ...patch,
            consultationFeeCents: typeof fee === 'number' ? toCents(fee) : null,
          }
        : patch;
    const result = await this.prisma.user.updateMany({
      where: { id },
      data,
    });
    return result.count;
  }

  async findDoctorForResponse(id: string): Promise<DoctorAfterUpdate | null> {
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
        hprId: true,
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
    if (!user) return null;
    return user satisfies DoctorAfterUpdate;
  }

  async updateDoctorClinicRole(
    doctorId: string,
    role: Role | string,
  ): Promise<void> {
    const nextRole =
      typeof role === 'string'
        ? parseStringEnumMember(ROLE_VALUES, role)
        : role;
    if (!nextRole) {
      throw new Error(`Invalid doctor clinic role: ${role}`);
    }
    await this.prisma.doctorClinic.updateMany({
      where: { doctorId },
      data: { role: nextRole },
    });
  }

  async deleteDoctorCascading(id: string): Promise<number> {
    await this.prisma.doctorEducation.deleteMany({ where: { doctorId: id } });
    await this.prisma.doctorCertification.deleteMany({
      where: { doctorId: id },
    });
    await this.prisma.doctorSpecialization.deleteMany({
      where: { doctorId: id },
    });
    await this.prisma.doctorClinic.deleteMany({ where: { doctorId: id } });

    const result = await this.prisma.user.deleteMany({ where: { id } });
    return result.count;
  }
}
