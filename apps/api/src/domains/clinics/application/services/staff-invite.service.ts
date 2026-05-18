import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Role, Specialization } from '@workspace/db';
import {
  isClinicFrontDesk,
  mapClinicMemberRoleToPrisma,
  type CreateClinicMemberData,
  type CreateDoctorData,
  type CreateReceptionistData,
} from './staff-management-helpers';

// AuditLogged: all staff creation methods (doctor, receptionist, member) are sensitive writes
@Injectable()
export class StaffInviteService {
  constructor(private prisma: PrismaService) {}

  async createDoctor(clinicId: string, data: CreateDoctorData) {
    const isFrontDesk = await isClinicFrontDesk(this.prisma, clinicId);

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
      ...(isFrontDesk ? { appLoginDisabled: true } : {}),
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

  async createReceptionist(clinicId: string, data: CreateReceptionistData) {
    const isFrontDesk = await isClinicFrontDesk(this.prisma, clinicId);
    if (isFrontDesk && data.role === 'NURSE') {
      throw new BadRequestException(
        'This role is not available for the front desk workspace.',
      );
    }
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

  async createMember(clinicId: string, data: CreateClinicMemberData) {
    const isFrontDesk = await isClinicFrontDesk(this.prisma, clinicId);
    if (isFrontDesk) {
      if (data.role === 'NURSE' || data.role === 'ADMIN_DOCTOR') {
        throw new BadRequestException(
          'This role is not available for the front desk workspace.',
        );
      }
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const prismaRole = mapClinicMemberRoleToPrisma(data.role);
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
        ...(isFrontDesk && prismaRole === Role.DOCTOR
          ? { appLoginDisabled: true }
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
}
