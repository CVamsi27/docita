import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { PaymentWebSocketGateway } from '@/websockets/payment.websocket.gateway';
import {
  ClinicTier,
  ClinicType,
  Prisma,
  Role,
  SubscriptionStatus,
} from '@workspace/db';
import { parseStringEnumMember } from '@workspace/utils';
import { CLINIC_ADMIN_ROLES } from '@/shared/common/constants/role-groups';
import * as bcrypt from 'bcrypt';
import {
  CLINIC_CARD_SELECT,
  DOCTOR_CARD_SELECT,
  DOCTOR_DETAIL_SELECT,
} from '@/shared/common/select-fragments';
import { paginateWithCursor } from '@/shared/common/pagination.helper';
import type { CreateAdminDto, UpdateAdminDto } from '@workspace/types';
import {
  InternalCreateClinicDto,
  InternalUpdateClinicDto,
} from './dto/clinic-management.dto';
import { ClinicFactory } from '@/domains/clinics/core/factories/clinic.factory';
import { UserFactory } from '@/domains/users/core/factories/user.factory';

const CLINIC_ADMIN_SELECT = {
  id: true,
  name: true,
  email: true,
  phoneNumber: true,
  role: true,
  appLoginDisabled: true,
  createdAt: true,
  updatedAt: true,
} as const;

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
        findMany: (args?: Prisma.ClinicFindManyArgs) =>
          this.prisma.clinic.findMany(args),
        count: (args?: Prisma.ClinicCountArgs) =>
          this.prisma.clinic.count(args),
      };

      return paginateWithCursor({
        model: clinicModel,
        cursor: options?.cursor,
        limit: options?.limit || 50,
        orderBy: { createdAt: 'desc' },
        select: CLINIC_CARD_SELECT,
      });
    } catch (_error) {
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
        ...DOCTOR_DETAIL_SELECT,
      },
    });

    if (!doctor) throw new BadRequestException('Doctor not found in clinic');

    return doctor;
  }

  async createClinic(data: InternalCreateClinicDto) {
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
      tier: data.tier || ClinicTier.ESSENTIAL,
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

  async updateClinic(id: string, data: InternalUpdateClinicDto) {
    const clinicType =
      data.type !== undefined
        ? parseStringEnumMember(Object.values(ClinicType), data.type)
        : undefined;
    const updateData: Prisma.ClinicUpdateInput = {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.email !== undefined ? { email: data.email } : {}),
      ...(data.phone !== undefined ? { phone: data.phone } : {}),
      ...(data.address !== undefined ? { address: data.address } : {}),
      ...(data.tier !== undefined ? { tier: data.tier } : {}),
      ...(clinicType != null ? { type: clinicType } : {}),
      ...(data.active !== undefined ? { active: data.active } : {}),
    };
    const clinic = await this.prisma.clinic.update({
      where: { id },
      data: updateData,
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
        role: { in: CLINIC_ADMIN_ROLES },
      },
      select: CLINIC_ADMIN_SELECT,
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
        appLoginDisabled: false,
      },
      select: CLINIC_ADMIN_SELECT,
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
      select: CLINIC_ADMIN_SELECT,
    });
  }

  private async findClinicAdminOrThrow(adminId: string) {
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId },
      select: { id: true, role: true },
    });
    if (!admin || !CLINIC_ADMIN_ROLES.includes(admin.role)) {
      throw new BadRequestException('Admin not found');
    }
    return admin;
  }

  async deactivateAdmin(adminId: string) {
    await this.findClinicAdminOrThrow(adminId);
    return this.prisma.user.update({
      where: { id: adminId },
      data: { appLoginDisabled: true },
      select: CLINIC_ADMIN_SELECT,
    });
  }

  async activateAdmin(adminId: string) {
    await this.findClinicAdminOrThrow(adminId);
    return this.prisma.user.update({
      where: { id: adminId },
      data: { appLoginDisabled: false },
      select: CLINIC_ADMIN_SELECT,
    });
  }
}
