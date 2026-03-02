import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  ClinicTier,
  ClinicType,
  Prisma,
  SubscriptionStatus,
} from '@workspace/db';
import { ClinicFactory } from '@/domains/clinics/core/factories/clinic.factory';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';

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

  private toRecord(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object') {
      return {};
    }

    return Object.fromEntries(Object.entries(value));
  }

  private readString(
    source: Record<string, unknown>,
    key: string,
  ): string | undefined {
    const value = source[key];
    return typeof value === 'string' ? value : undefined;
  }

  private readStringArray(
    source: Record<string, unknown>,
    key: string,
  ): string[] | undefined {
    const value = source[key];
    if (!Array.isArray(value)) {
      return undefined;
    }

    const normalized = value.filter(
      (item): item is string => typeof item === 'string',
    );
    return normalized.length > 0 ? normalized : [];
  }

  private readNumber(
    source: Record<string, unknown>,
    key: string,
  ): number | undefined {
    const value = source[key];
    return typeof value === 'number' ? value : undefined;
  }

  async create(data: CreateClinicData) {
    const clinicInput = this.clinicFactory.create({
      name: data.name,
      email: data.email,
      phone: data.phone,
      address: data.address,
      tier: data.tier,
      settings: this.toRecord(data.settings),
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

    const settings = this.toRecord(clinic.settings);
    return {
      ...clinic,
      phoneNumber: clinic.phone,
      description: this.readString(settings, 'description'),
      openingTime: this.readString(settings, 'openingTime'),
      closingTime: this.readString(settings, 'closingTime'),
      workingDays: this.readStringArray(settings, 'workingDays'),
      consultationDuration: this.readNumber(settings, 'consultationDuration'),
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
      const settings = this.toRecord(clinic.settings);
      return {
        ...clinic,
        phoneNumber: clinic.phone,
        description: this.readString(settings, 'description'),
        openingTime: this.readString(settings, 'openingTime'),
        closingTime: this.readString(settings, 'closingTime'),
        workingDays: this.readStringArray(settings, 'workingDays'),
        consultationDuration: this.readNumber(settings, 'consultationDuration'),
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
