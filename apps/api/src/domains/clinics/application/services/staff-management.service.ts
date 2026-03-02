import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Role, Specialization } from '@workspace/db';

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
}

interface UpdateMemberData {
  name?: string;
  email?: string;
  phoneNumber?: string;
  role?: 'DOCTOR' | 'RECEPTIONIST' | 'ADMIN_DOCTOR';
  specialization?: string;
  qualification?: string;
  registrationNumber?: string;
}

@Injectable()
export class StaffManagementService {
  constructor(private prisma: PrismaService) {}

  async createDoctor(clinicId: string, data: CreateDoctorData) {
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
        role: Role.RECEPTIONIST,
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

    if (member.role === Role.ADMIN && data.role) {
      throw new ForbiddenException('Admin role cannot be changed here');
    }

    if (
      data.role &&
      ![Role.DOCTOR, Role.RECEPTIONIST, Role.ADMIN_DOCTOR].includes(data.role)
    ) {
      throw new BadRequestException('Invalid role for clinic member update');
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
