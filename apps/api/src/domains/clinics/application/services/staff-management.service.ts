import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
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

    // Create DoctorClinic association
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
}
