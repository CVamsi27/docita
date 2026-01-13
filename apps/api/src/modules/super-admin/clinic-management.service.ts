import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentGateway } from '../../gateways/payment.gateway';
import { ClinicTier } from '@workspace/db';
import * as bcrypt from 'bcrypt';
import {
  CLINIC_CARD_SELECT,
  DOCTOR_CARD_SELECT,
} from '../../common/select-fragments';
import { paginateWithCursor } from '../../common/pagination.helper';

@Injectable()
export class ClinicManagementService {
  constructor(
    private prisma: PrismaService,
    private paymentGateway: PaymentGateway,
  ) {}

  async getAllClinics(options?: { cursor?: string; limit?: number }) {
    try {
      return paginateWithCursor({
        model: this.prisma.clinic,
        cursor: options?.cursor,
        limit: options?.limit || 50,
        orderBy: { createdAt: 'desc' },
        select: CLINIC_CARD_SELECT,
      });
    } catch (error) {
      throw new InternalServerErrorException('Failed to fetch clinics');
    }
  }

  async getClinicDoctors(clinicId: string) {
    const doctorClinics = await this.prisma.doctorClinic.findMany({
      where: { clinicId },
      include: {
        doctor: { select: DOCTOR_CARD_SELECT },
      },
    });
    return doctorClinics.map((dc) => dc.doctor);
  }

  async createClinic(data: any) {
    const existingClinic = await this.prisma.clinic.findFirst({
      where: { email: data.email },
    });
    if (existingClinic)
      throw new BadRequestException('Clinic email already exists');

    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.adminEmail },
    });
    if (existingUser)
      throw new BadRequestException('Admin email already exists');

    const hashedPassword = await bcrypt.hash(data.adminPassword, 10);

    return this.prisma.clinic.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        tier: data.tier || 'CORE',
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
        users: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true,
          },
        },
      },
    });
  }

  async updateClinicTier(id: string, tier: ClinicTier) {
    const clinic = await this.prisma.clinic.update({
      where: { id },
      data: { tier },
    });
    this.paymentGateway.emitClinicUpdate(id, { clinicId: id, tier });
    return clinic;
  }

  async updateClinicStatus(id: string, active: boolean) {
    const clinic = await this.prisma.clinic.update({
      where: { id },
      data: { active },
    });
    this.paymentGateway.emitClinicUpdate(id, {
      clinicId: id,
      subscriptionStatus: active ? 'active' : 'inactive',
    });
    return clinic;
  }

  async updateClinic(id: string, data: any) {
    const clinic = await this.prisma.clinic.update({
      where: { id },
      data,
    });
    if (data.tier !== undefined || data.active !== undefined) {
      this.paymentGateway.emitClinicUpdate(id, {
        clinicId: id,
        tier: data.tier,
        subscriptionStatus: data.active ? 'active' : 'inactive',
      });
    }
    return clinic;
  }

  async getClinicAdmins(clinicId: string) {
    return this.prisma.user.findMany({
      where: {
        clinicId,
        role: { in: ['ADMIN', 'ADMIN_DOCTOR'] },
      },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createAdmin(clinicId: string, data: any) {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
    });
    if (!clinic) throw new BadRequestException('Clinic not found');

    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existingUser) throw new BadRequestException('Email already in use');

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const role = data.adminType === 'admin_doctor' ? 'ADMIN_DOCTOR' : 'ADMIN';

    return this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        phoneNumber: data.phoneNumber,
        role,
        clinicId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });
  }

  async getAdminDetails(adminId: string) {
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId },
      include: {
        clinic: { select: { id: true, name: true } },
      },
    });
    if (!admin) throw new BadRequestException('Admin not found');
    return admin;
  }

  async updateAdmin(adminId: string, data: any) {
    const admin = await this.prisma.user.findUnique({ where: { id: adminId } });
    if (!admin) throw new BadRequestException('Admin not found');

    if (data.email && data.email !== admin.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: data.email },
      });
      if (existingUser) throw new BadRequestException('Email already in use');
    }

    const updateData: any = { ...data };
    if (data.adminType) {
      updateData.role =
        data.adminType === 'admin_doctor' ? 'ADMIN_DOCTOR' : 'ADMIN';
      delete updateData.adminType;
    }

    return this.prisma.user.update({
      where: { id: adminId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        updatedAt: true,
      },
    });
  }

  async deactivateAdmin(adminId: string) {
    return await Promise.resolve({
      id: adminId,
      message:
        'Admin deactivation requires additional setup (active/status field on User model)',
    });
  }

  async activateAdmin(adminId: string) {
    return await Promise.resolve({
      id: adminId,
      message:
        'Admin activation requires additional setup (active/status field on User model)',
    });
  }
}
