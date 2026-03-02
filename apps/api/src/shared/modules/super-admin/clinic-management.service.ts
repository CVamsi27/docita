import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { PaymentWebSocketGateway } from '@/gateways/payment.websocket.gateway';
import { ClinicTier, Prisma, Role, SubscriptionStatus } from '@workspace/db';
import * as bcrypt from 'bcrypt';
import {
  CLINIC_CARD_SELECT,
  DOCTOR_CARD_SELECT,
} from '@/common/select-fragments';
import { paginateWithCursor } from '@/common/pagination.helper';
import type { CreateAdminDto, UpdateAdminDto } from '@workspace/types';
import {
  SuperAdminCreateClinicDto,
  SuperAdminUpdateClinicDto,
} from './dto/clinic-management.dto';
import { ClinicFactory } from '@/domains/clinics/core/factories/clinic.factory';
import { UserFactory } from '@/domains/users/core/factories/user.factory';

@Injectable()
export class ClinicManagementService {
  constructor(
    private prisma: PrismaService,
    private paymentGateway: PaymentWebSocketGateway,
    private clinicFactory: ClinicFactory,
    private userFactory: UserFactory,
  ) {}

  async getAllClinics(options?: { cursor?: string; limit?: number }) {
    try {
      const clinicModel = {
        findMany: (args?: Record<string, unknown>) =>
          this.prisma.clinic.findMany(args as Prisma.ClinicFindManyArgs),
        count: (args?: { where?: Record<string, unknown> }) =>
          this.prisma.clinic.count(args as Prisma.ClinicCountArgs),
      };

      return paginateWithCursor({
        model: clinicModel,
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

  async getClinicDoctorDetails(clinicId: string, doctorId: string) {
    const doctor = await this.prisma.user.findFirst({
      where: {
        id: doctorId,
        role: { in: [Role.DOCTOR, Role.ADMIN_DOCTOR] },
        OR: [
          { clinicId },
          {
            doctorClinics: {
              some: {
                clinicId,
                active: true,
              },
            },
          },
        ],
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        clinicId: true,
        specialization: true,
        hospitalRole: true,
        qualification: true,
        registrationNumber: true,
        licenseNumber: true,
        licenseExpiry: true,
        signatureUrl: true,
        signatureUploadedAt: true,
        verificationStatus: true,
        verificationSource: true,
        verificationRef: true,
        verificationReason: true,
        verificationData: true,
        verificationCheckedAt: true,
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

    if (!doctor) {
      throw new BadRequestException('Doctor not found in clinic');
    }

    return doctor;
  }

  async createClinic(data: SuperAdminCreateClinicDto) {
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

    const clinicInput = this.clinicFactory.create({
      name: data.name,
      email: data.email,
      phone: data.phone,
      address: data.address,
      tier: data.tier || ClinicTier.CORE,
    });

    const userInput = this.userFactory.create(Role.ADMIN, {
      email: data.adminEmail,
      name: data.adminName,
      passwordHash: hashedPassword,
    });

    return this.prisma.clinic.create({
      data: {
        ...clinicInput,
        users: {
          create: userInput,
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
      subscriptionStatus: active
        ? SubscriptionStatus.ACTIVE
        : SubscriptionStatus.EXPIRED,
    });
    return clinic;
  }

  async updateClinic(id: string, data: SuperAdminUpdateClinicDto) {
    const clinic = await this.prisma.clinic.update({
      where: { id },
      data: data as Prisma.ClinicUpdateInput,
    });
    if (data.tier !== undefined || data.active !== undefined) {
      this.paymentGateway.emitClinicUpdate(id, {
        clinicId: id,
        tier: data.tier,
        subscriptionStatus: data.active
          ? SubscriptionStatus.ACTIVE
          : SubscriptionStatus.EXPIRED,
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

  async createAdmin(clinicId: string, data: CreateAdminDto) {
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

  async updateAdmin(adminId: string, data: UpdateAdminDto) {
    const admin = await this.prisma.user.findUnique({ where: { id: adminId } });
    if (!admin) throw new BadRequestException('Admin not found');

    if (data.email && data.email !== admin.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: data.email },
      });
      if (existingUser) throw new BadRequestException('Email already in use');
    }

    const updateData: Record<string, unknown> = { ...data };
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
