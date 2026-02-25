import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  ClinicTier,
  ClinicType,
  Prisma,
  SubscriptionStatus,
} from '@workspace/db';
import { ClinicFactory } from '../../core/factories/clinic.factory';
import { AppConfigService } from '../../../../shared/modules/config/app-configuration.service';

interface CreateClinicData {
  name: string;
  address: string;
  phone: string;
  email: string;
  logo?: string;
  tier?: ClinicTier;
  type?: ClinicType;
  settings?: Prisma.InputJsonValue;
}

interface UpdateClinicData {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  logo?: string;
  tier?: ClinicTier;
  type?: ClinicType;
  settings?: Prisma.InputJsonValue;
}

@Injectable()
export class ClinicDataService {
  constructor(
    private prisma: PrismaService,
    private clinicFactory: ClinicFactory,
    private configService: AppConfigService,
  ) {}

  async create(data: CreateClinicData) {
    const clinicInput = this.clinicFactory.create({
      name: data.name,
      email: data.email,
      phone: data.phone,
      address: data.address,
      tier: data.tier,
      settings: data.settings as Record<string, unknown>,
    });

    return this.prisma.clinic.create({
      data: {
        ...clinicInput,
        logo: data.logo,
        type: data.type,
        subscriptionStatus: this.configService.isProduction()
          ? undefined
          : SubscriptionStatus.TRIALING,
      },
    });
  }

  async findAll() {
    return this.prisma.clinic.findMany({
      where: { active: true },
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

  async findOne(id: string) {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        _count: {
          select: {
            patients: true,
            appointments: true,
          },
        },
      },
    });

    if (!clinic) return null;

    // Flatten settings for frontend convenience
    const settings = clinic.settings as Record<string, unknown> | null;
    return {
      ...clinic,
      phoneNumber: clinic.phone,
      description: settings?.description as string | undefined,
      openingTime: settings?.openingTime as string | undefined,
      closingTime: settings?.closingTime as string | undefined,
      workingDays: settings?.workingDays as string[] | undefined,
      consultationDuration: settings?.consultationDuration as
        | number
        | undefined,
    };
  }

  async update(id: string, data: UpdateClinicData) {
    return this.prisma.clinic.update({
      where: { id },
      data: {
        name: data.name,
        address: data.address,
        phone: data.phone,
        email: data.email,
        logo: data.logo,
        tier: data.tier,
        type: data.type,
        settings: data.settings,
      },
    });
  }

  async delete(id: string) {
    return this.prisma.clinic.update({
      where: { id },
      data: { active: false },
    });
  }

  async getUserClinics(userId: string) {
    const doctorClinics = await this.prisma.doctorClinic.findMany({
      where: {
        doctorId: userId,
        active: true,
      },
      select: {
        clinic: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
            email: true,
            website: true,
            tier: true,
            logo: true,
            active: true,
            settings: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    return doctorClinics.map((dc) => {
      const clinic = dc.clinic;
      const settings = clinic.settings as Record<string, unknown> | null;
      return {
        ...clinic,
        phoneNumber: clinic.phone,
        description: settings?.description as string | undefined,
        openingTime: settings?.openingTime as string | undefined,
        closingTime: settings?.closingTime as string | undefined,
        workingDays: settings?.workingDays as string[] | undefined,
        consultationDuration: settings?.consultationDuration as
          | number
          | undefined,
      };
    });
  }

  async getClinicStats(clinicId: string) {
    const [patients, appointments, todayAppointments] = await Promise.all([
      this.prisma.patient.count({ where: { clinicId } }),
      this.prisma.appointment.count({ where: { clinicId } }),
      this.prisma.appointment.count({
        where: {
          clinicId,
          startTime: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lte: new Date(new Date().setHours(23, 59, 59, 999)),
          },
        },
      }),
    ]);

    return {
      totalPatients: patients,
      totalAppointments: appointments,
      todayAppointments,
    };
  }
}
