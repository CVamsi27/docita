import { Injectable } from '@nestjs/common';
import { Role } from '@workspace/db';
import { PrismaService } from '@/prisma/prisma.service';
import {
  IClinicDataRepository,
  CreateClinicInput,
  UpdateClinicInput,
  ClinicStats,
  ClinicLookup,
  ClinicSearchResult,
  UserForClinicJoin,
} from '@/domains/clinics/core/repositories/clinic-data.repository.interface';

@Injectable()
export class PrismaClinicDataRepository implements IClinicDataRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByReferralCode(code: string): Promise<{ id: string } | null> {
    return this.prisma.clinic.findUnique({
      where: { referralCode: code },
      select: { id: true },
    });
  }

  async create(data: CreateClinicInput): Promise<unknown> {
    return this.prisma.clinic.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        logo: data.logo,
        tier: data.tier as never,
        type: data.type as never,
        referralCode: data.referralCode,
        subscriptionStatus: data.subscriptionStatus as never,
        settings: data.settings as never,
      },
    });
  }

  async findAll(): Promise<unknown[]> {
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

  async findById(id: string): Promise<unknown | null> {
    return this.prisma.clinic.findUnique({
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
  }

  async update(id: string, data: UpdateClinicInput): Promise<unknown> {
    return this.prisma.clinic.update({
      where: { id },
      data: {
        name: data.name,
        address: data.address,
        phone: data.phone,
        email: data.email,
        logo: data.logo,
        tier: data.tier as never,
        type: data.type as never,
        settings: data.settings as never,
      },
    });
  }

  async softDelete(id: string): Promise<unknown> {
    return this.prisma.clinic.update({
      where: { id },
      data: { active: false },
    });
  }

  async findDoctorClinics(doctorId: string): Promise<unknown[]> {
    return this.prisma.doctorClinic.findMany({
      where: { doctorId, active: true },
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
  }

  async getStats(clinicId: string): Promise<ClinicStats> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const [totalPatients, totalAppointments, todayAppointments] =
      await Promise.all([
        this.prisma.patient.count({ where: { clinicId } }),
        this.prisma.appointment.count({ where: { clinicId } }),
        this.prisma.appointment.count({
          where: {
            clinicId,
            startTime: { gte: startOfDay, lte: endOfDay },
          },
        }),
      ]);

    return { totalPatients, totalAppointments, todayAppointments };
  }

  async findUserForJoin(userId: string): Promise<UserForClinicJoin | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, clinicId: true },
    });
  }

  async findClinicByCodeOrEmail(
    code?: string,
    email?: string,
  ): Promise<ClinicLookup | null> {
    return this.prisma.clinic.findFirst({
      where: {
        active: true,
        ...(code ? { referralCode: code } : { email }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        referralCode: true,
      },
    });
  }

  async joinClinic(
    userId: string,
    clinicId: string,
    userRole: string,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { clinicId },
      });

      if (userRole === Role.DOCTOR || userRole === Role.ADMIN_DOCTOR) {
        await tx.doctorClinic.upsert({
          where: { doctorId_clinicId: { doctorId: userId, clinicId } },
          create: {
            doctorId: userId,
            clinicId,
            role: userRole === Role.ADMIN_DOCTOR ? 'admin_doctor' : 'doctor',
            active: true,
          },
          update: { active: true },
        });
      }
    });
  }

  async searchActive(query: string): Promise<ClinicSearchResult[]> {
    const searchTerm = query.toLowerCase().trim();
    return this.prisma.clinic.findMany({
      where: {
        active: true,
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { email: { contains: searchTerm, mode: 'insensitive' } },
          { referralCode: { equals: searchTerm, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        address: true,
        phone: true,
        referralCode: true,
      },
      take: 20,
      orderBy: { name: 'asc' },
    });
  }
}
