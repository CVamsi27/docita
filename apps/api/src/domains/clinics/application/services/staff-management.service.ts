import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Role, Specialization } from '@workspace/db';
import { isFrontDeskWorkspace, parseWorkspaceProfile } from '@workspace/types';

type ClinicMemberRole =
  | 'DOCTOR'
  | 'NURSE'
  | 'RECEPTIONIST'
  | 'ADMIN'
  | 'ADMIN_DOCTOR';

/** Clinic admins (ADMIN / ADMIN_DOCTOR) may assign any allowed clinic member role. */
const actorMayAssignMemberRoles = (
  actorRole: Role | ClinicMemberRole | undefined,
): actorRole is 'ADMIN' | 'ADMIN_DOCTOR' =>
  actorRole === Role.ADMIN || actorRole === Role.ADMIN_DOCTOR;

interface CreateDoctorData {
  name: string;
  email: string;
  password: string;
  phoneNumber?: string;
  specialization?: string;
  qualification?: string;
  registrationNumber?: string;
}

interface CreateReceptionistData {
  name: string;
  email: string;
  password: string;
  phoneNumber?: string;
  role?: 'RECEPTIONIST' | 'NURSE';
}

interface CreateClinicMemberData {
  name: string;
  email: string;
  password: string;
  phoneNumber?: string;
  role: ClinicMemberRole;
  specialization?: string;
  qualification?: string;
  registrationNumber?: string;
}

interface UpdateMemberData {
  name?: string;
  email?: string;
  phoneNumber?: string;
  role?: ClinicMemberRole;
  specialization?: string;
  qualification?: string;
  registrationNumber?: string;
}

@Injectable()
export class StaffManagementService {
  constructor(private prisma: PrismaService) {}

  private async getClinicWorkspaceProfile(clinicId: string) {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { settings: true },
    });
    const raw =
      clinic?.settings && typeof clinic.settings === 'object'
        ? (clinic.settings as Record<string, unknown>)
        : {};
    return parseWorkspaceProfile(raw.workspaceProfile);
  }

  private async countDoctorsInClinic(clinicId: string): Promise<number> {
    return this.prisma.user.count({
      where: { clinicId, role: Role.DOCTOR },
    });
  }

  async createDoctor(clinicId: string, data: CreateDoctorData) {
    if (isFrontDeskWorkspace(await this.getClinicWorkspaceProfile(clinicId))) {
      if ((await this.countDoctorsInClinic(clinicId)) >= 1) {
        throw new BadRequestException(
          'This workspace already has a schedule doctor profile.',
        );
      }
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const userData = {
      name: data.name,
      email: data.email,
      password: hashedPassword,
      role: Role.DOCTOR,
      clinicId,
      phoneNumber: data.phoneNumber,
      qualification: data.qualification,
      registrationNumber: data.registrationNumber,
      specialization: data.specialization as Specialization,
    };

    const user = await this.prisma.user.create({
      data: userData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phoneNumber: true,
        specialization: true,
        qualification: true,
        registrationNumber: true,
        createdAt: true,
      },
    });

    await this.prisma.doctorClinic.create({
      data: {
        doctorId: user.id,
        clinicId,
      },
    });

    return user;
  }

  async createMember(clinicId: string, data: CreateClinicMemberData) {
    const workspaceProfile = await this.getClinicWorkspaceProfile(clinicId);
    if (isFrontDeskWorkspace(workspaceProfile)) {
      if (data.role === 'NURSE' || data.role === 'ADMIN_DOCTOR') {
        throw new BadRequestException(
          'This role is not available for the front desk workspace.',
        );
      }
      if (
        data.role === 'DOCTOR' &&
        (await this.countDoctorsInClinic(clinicId)) >= 1
      ) {
        throw new BadRequestException(
          'Only one doctor profile is allowed for the front desk workspace.',
        );
      }
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const prismaRole: Role =
      data.role === 'DOCTOR'
        ? Role.DOCTOR
        : data.role === 'NURSE'
          ? Role.NURSE
          : data.role === 'RECEPTIONIST'
            ? Role.RECEPTIONIST
            : data.role === 'ADMIN'
              ? Role.ADMIN
              : Role.ADMIN_DOCTOR;

    const needsDoctorClinic =
      data.role === 'DOCTOR' || data.role === 'ADMIN_DOCTOR';

    const user = await this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        role: prismaRole,
        clinicId,
        phoneNumber: data.phoneNumber,
        ...(needsDoctorClinic
          ? {
              qualification: data.qualification,
              registrationNumber: data.registrationNumber,
              specialization: data.specialization as Specialization,
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phoneNumber: true,
        specialization: true,
        qualification: true,
        registrationNumber: true,
        createdAt: true,
      },
    });

    if (needsDoctorClinic) {
      await this.prisma.doctorClinic.create({
        data: {
          doctorId: user.id,
          clinicId,
        },
      });
    }

    return user;
  }

  async getDoctors(clinicId: string) {
    return this.prisma.user.findMany({
      where: {
        clinicId,
        role: Role.DOCTOR,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phoneNumber: true,
        specialization: true,
        qualification: true,
        registrationNumber: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async createReceptionist(clinicId: string, data: CreateReceptionistData) {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        role: data.role === 'NURSE' ? Role.NURSE : Role.RECEPTIONIST,
        clinicId,
        phoneNumber: data.phoneNumber,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phoneNumber: true,
        createdAt: true,
      },
    });

    return user;
  }

  async getReceptionists(clinicId: string) {
    return this.prisma.user.findMany({
      where: {
        clinicId,
        role: Role.RECEPTIONIST,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phoneNumber: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getMembers(clinicId: string) {
    return this.prisma.user.findMany({
      where: {
        clinicId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phoneNumber: true,
        specialization: true,
        hospitalRole: true,
        qualification: true,
        registrationNumber: true,
        signatureUploadedAt: true,
        verificationStatus: true,
        verificationReason: true,
        verificationCheckedAt: true,
        profilePhotoUrl: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async updateMember(
    clinicId: string,
    memberId: string,
    data: UpdateMemberData,
    actorUserId: string,
    actorRole: Role,
  ) {
    const member = await this.prisma.user.findFirst({
      where: {
        id: memberId,
        clinicId,
      },
      select: {
        id: true,
        role: true,
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found in this clinic');
    }

    if (actorUserId === memberId && data.role && data.role !== member.role) {
      throw new BadRequestException('You cannot change your own role');
    }

    if (
      data.role &&
      ![
        Role.DOCTOR,
        Role.NURSE,
        Role.RECEPTIONIST,
        Role.ADMIN,
        Role.ADMIN_DOCTOR,
      ].includes(data.role)
    ) {
      throw new BadRequestException('Invalid role for clinic member update');
    }

    if (data.role && data.role !== member.role) {
      if (!actorMayAssignMemberRoles(actorRole)) {
        throw new ForbiddenException('Only admins can change member roles');
      }
    }

    if (data.role) {
      const workspaceProfile = await this.getClinicWorkspaceProfile(clinicId);
      if (isFrontDeskWorkspace(workspaceProfile)) {
        if (data.role === 'NURSE' || data.role === 'ADMIN_DOCTOR') {
          throw new BadRequestException(
            'This role is not available for the front desk workspace.',
          );
        }
        if (data.role === 'DOCTOR') {
          const otherDoctors = await this.prisma.user.count({
            where: {
              clinicId,
              role: Role.DOCTOR,
              NOT: { id: memberId },
            },
          });
          if (otherDoctors >= 1) {
            throw new BadRequestException(
              'Only one doctor profile is allowed for the front desk workspace.',
            );
          }
        }
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: memberId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.email !== undefined ? { email: data.email } : {}),
        ...(data.phoneNumber !== undefined
          ? { phoneNumber: data.phoneNumber }
          : {}),
        ...(data.role !== undefined ? { role: data.role } : {}),
        ...(data.specialization !== undefined
          ? { specialization: data.specialization as Specialization }
          : {}),
        ...(data.qualification !== undefined
          ? { qualification: data.qualification }
          : {}),
        ...(data.registrationNumber !== undefined
          ? { registrationNumber: data.registrationNumber }
          : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phoneNumber: true,
        specialization: true,
        qualification: true,
        registrationNumber: true,
        signatureUploadedAt: true,
        verificationStatus: true,
        verificationReason: true,
        verificationCheckedAt: true,
        profilePhotoUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updated;
  }

  async removeMember(clinicId: string, memberId: string, actorUserId: string) {
    const member = await this.prisma.user.findFirst({
      where: {
        id: memberId,
        clinicId,
      },
      select: {
        id: true,
        role: true,
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found in this clinic');
    }

    if (actorUserId === memberId) {
      throw new BadRequestException('You cannot remove your own account');
    }

    if (member.role === Role.ADMIN) {
      throw new ForbiddenException('Admin account cannot be removed here');
    }

    await this.prisma.user.delete({
      where: { id: memberId },
    });

    return { success: true };
  }
}
