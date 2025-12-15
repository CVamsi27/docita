import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClinicTier, ClinicType, Prisma } from '@workspace/db';
import * as bcrypt from 'bcrypt';

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

interface ClinicSettingsData {
  name?: string;
  address?: string;
  phone?: string;
  phoneNumber?: string;
  email?: string;
  website?: string;
  description?: string;
  openingTime?: string;
  closingTime?: string;
  workingDays?: string[];
  consultationDuration?: number;
  type?: ClinicType;
}

@Injectable()
export class ClinicsService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateClinicData) {
    return this.prisma.clinic.create({
      data: {
        name: data.name,
        address: data.address,
        phone: data.phone,
        email: data.email,
        logo: data.logo,
        tier: data.tier || ClinicTier.CORE, // Default to CORE for basic functionality
        type: data.type,
        settings: data.settings ?? Prisma.JsonNull,
        active: true,
        // For local development/e2e runs, default clinics to a trial subscription
        // so feature/tier checks pass without needing external subscription webhooks.
        subscriptionStatus:
          process.env.NODE_ENV === 'production' ? undefined : 'trial',
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
      phoneNumber: clinic.phone, // Map phone to phoneNumber for frontend
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

  async updateSettings(id: string, data: ClinicSettingsData) {
    return this.prisma.clinic.update({
      where: { id },
      data: {
        name: data.name,
        address: data.address,
        phone: data.phoneNumber || data.phone,
        email: data.email,
        website: data.website,
        type: data.type,
        settings: {
          description: data.description,
          openingTime: data.openingTime,
          closingTime: data.closingTime,
          workingDays: data.workingDays,
          consultationDuration: data.consultationDuration,
        },
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
        phoneNumber: clinic.phone, // Map phone to phoneNumber for frontend
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

  async createDoctor(
    clinicId: string,
    data: {
      name: string;
      email: string;
      password: string;
      phoneNumber?: string;
      specialization?: string;
      qualification?: string;
      registrationNumber?: string;
    },
  ) {
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Build user data, only including specialization if provided and valid
    const userData: any = {
      name: data.name,
      email: data.email,
      password: hashedPassword,
      role: 'DOCTOR',
      clinicId,
      phoneNumber: data.phoneNumber,
      qualification: data.qualification,
      registrationNumber: data.registrationNumber,
    };

    // Only add specialization if provided
    if (data.specialization) {
      userData.specialization = data.specialization;
    }

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
        role: 'DOCTOR',
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

  async createReceptionist(
    clinicId: string,
    data: {
      name: string;
      email: string;
      password: string;
      phoneNumber?: string;
    },
  ) {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        role: 'RECEPTIONIST',
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
        role: 'RECEPTIONIST',
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
}
