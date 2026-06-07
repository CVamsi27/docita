// jscpd:ignore-start
import { Inject, Injectable } from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { PrismaService } from '@/prisma/prisma.service';
import {
  IClinicCoreRepository,
  CreateClinicInput,
  UpdateClinicInput,
  ClinicStats,
  ClinicLookup,
  ClinicSearchResult,
} from '@/domains/clinics/core/repositories/clinic-core.repository.interface';
import { getClinicLocalDayUtcBounds } from '@/shared/common/utils/clinic-calendar-bounds';
import { DEFAULT_TIMEZONE, formatClinicTodayPickerIso } from '@workspace/utils';

@Injectable()
export class PrismaClinicCoreRepository implements IClinicCoreRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  private getReadClient() {
    return this.prisma.getReadClient();
  }

  async findByReferralCode(code: string): Promise<{ id: string } | null> {
// jscpd:ignore-end
    return this.getReadClient().clinic.findUnique({
      where: { referralCode: code },
      select: { id: true },
    });
  }

  async create(data: CreateClinicInput) {
    return this.prisma.clinic.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        logo: data.logo,
        tier: data.tier,
        type: data.type,
        referralCode: data.referralCode,
        subscriptionStatus: data.subscriptionStatus,
        settings: data.settings,
      },
    });
  }

  async findAll() {
    return this.getReadClient().clinic.findMany({
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

  async findById(id: string) {
    return this.getReadClient().clinic.findUnique({
      where: { id },
      include: {
        subscription: {
          select: {
            graceUntil: true,
          },
        },
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

  async update(id: string, data: UpdateClinicInput) {
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

  async softDelete(id: string) {
    return this.prisma.clinic.update({
      where: { id },
      data: { active: false },
    });
  }

  async findDoctorClinics(doctorId: string) {
    return this.getReadClient().doctorClinic.findMany({
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
    const clinic = await this.getReadClient().clinic.findUnique({
      where: { id: clinicId },
      select: { timezone: true },
    });
    const timezone = clinic?.timezone?.trim() || DEFAULT_TIMEZONE;
    const todayPicker = formatClinicTodayPickerIso(timezone);
    const todayBounds = getClinicLocalDayUtcBounds(todayPicker, timezone);
    const startOfDay = todayBounds?.rangeStart ?? this.clock.now();
    const endOfDay =
      todayBounds?.rangeEndExclusive ??
      new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    const readClient = this.getReadClient();
    const [totalPatients, totalAppointments, todayAppointments] =
      await Promise.all([
        readClient.patient.count({ where: { clinicId } }),
        readClient.appointment.count({ where: { clinicId } }),
        readClient.appointment.count({
          where: {
            clinicId,
            startTime: { gte: startOfDay, lt: endOfDay },
          },
        }),
      ]);

    return { totalPatients, totalAppointments, todayAppointments };
  }

  async findClinicByCodeOrEmail(
    code?: string,
    email?: string,
  ): Promise<ClinicLookup | null> {
    return this.getReadClient().clinic.findFirst({
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

  async searchActive(query: string): Promise<ClinicSearchResult[]> {
    const searchTerm = query.toLowerCase().trim();
    return this.getReadClient().clinic.findMany({
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
