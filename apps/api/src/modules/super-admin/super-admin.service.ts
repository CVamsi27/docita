import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ClinicTier } from '@workspace/db';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SuperAdminService {
  constructor(private prisma: PrismaService) { }

  async getAllClinics() {
    return this.prisma.clinic.findMany({
      include: {
        _count: {
          select: {
            users: true,
            patients: true,
            appointments: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createClinic(data: {
    name: string;
    email: string;
    phone: string;
    address: string;
    adminName: string;
    adminEmail: string;
    adminPassword: string; // Should be hashed in a real app, but for now we assume it's handled or we hash it here
    tier?: ClinicTier;
  }) {
    // Check if clinic or admin email already exists
    const existingClinic = await this.prisma.clinic.findFirst({
      where: { email: data.email },
    });
    if (existingClinic) {
      throw new BadRequestException('Clinic email already exists');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.adminEmail },
    });
    if (existingUser) {
      throw new BadRequestException('Admin email already exists');
    }

    const hashedPassword = await bcrypt.hash(data.adminPassword, 10);

    const clinic = await this.prisma.clinic.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        tier: data.tier || 'FREE',
        users: {
          create: {
            email: data.adminEmail,
            name: data.adminName,
            password: hashedPassword,
            role: 'ADMIN',
          },
        },
      },
      include: {
        users: true,
      },
    });

    return clinic;
  }

  async updateClinicTier(id: string, tier: ClinicTier) {
    return this.prisma.clinic.update({
      where: { id },
      data: { tier },
    });
  }

  async updateClinicStatus(id: string, active: boolean) {
    return this.prisma.clinic.update({
      where: { id },
      data: { active },
    });
  }

  async updateClinic(id: string, data: any) {
    return this.prisma.clinic.update({
      where: { id },
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        tier: data.tier,
        active: data.active,
      },
    });
  }

  async getGlobalStats() {
    const [clinics, users, patients, invoices, prescriptions] = await Promise.all([
      this.prisma.clinic.count(),
      this.prisma.user.count(),
      this.prisma.patient.count(),
      this.prisma.invoice.count(),
      this.prisma.prescription.count(),
    ]);

    return {
      clinics,
      users,
      patients,
      invoices,
      prescriptions,
    };
  }
}
