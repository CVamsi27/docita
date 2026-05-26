import { BadRequestException, Injectable } from '@nestjs/common';
import type {
  PublicBookingClinicResponse,
  PublicBookingDoctorsResponse,
  PublicBookingSlotsResponse,
} from '@workspace/types';
import { publicBookingSlotsQuerySchema } from '@workspace/types';
import { PrismaService } from '@/prisma/prisma.service';
import { DoctorsService } from '@/domains/doctors/application/services/doctors.service';
import { SlotGenerationService } from '@/domains/doctors/application/services/slot-generation.service';
import {
  resolveClinicByReferralCode,
  withBookingTenant,
} from './public-booking-utils';

@Injectable()
export class PublicBookingSlotsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly doctorsService: DoctorsService,
    private readonly slotGeneration: SlotGenerationService,
  ) {}

  async getClinicSummary(
    referralCode: string,
  ): Promise<PublicBookingClinicResponse> {
    return resolveClinicByReferralCode(this.prisma, referralCode);
  }

  async listDoctors(
    referralCode: string,
  ): Promise<PublicBookingDoctorsResponse> {
    return withBookingTenant(this.prisma, referralCode, async (clinic) => {
      const doctors = await this.doctorsService.findAll(clinic.id);
      return {
        doctors: doctors.map((d) => ({
          id: d.id,
          name: d.name,
          specialization: d.specialization ?? undefined,
        })),
      };
    });
  }

  buildSlotStartDate(slotCalendarDate: string, time: string): Date {
    const [y, mo, d] = slotCalendarDate.split('-').map((v) => parseInt(v, 10));
    const [hh, mm] = time.split(':').map((v) => parseInt(v, 10));
    return new Date(y, mo - 1, d, hh, mm, 0, 0);
  }

  buildSlotIso(slotCalendarDate: string, time: string): string {
    return this.buildSlotStartDate(slotCalendarDate, time).toISOString();
  }

  private async doctorBelongsToClinic(
    doctorId: string,
    clinicId: string,
  ): Promise<boolean> {
    const [directUser, linkedClinic] = await Promise.all([
      this.prisma.user.count({
        where: {
          id: doctorId,
          clinicId,
          role: { in: ['DOCTOR', 'ADMIN_DOCTOR'] },
        },
      }),
      this.prisma.doctorClinic.count({
        where: {
          doctorId,
          clinicId,
          active: true,
        },
      }),
    ]);
    return directUser > 0 || linkedClinic > 0;
  }

  async listSlots(
    referralCode: string,
    rawQuery: unknown,
  ): Promise<PublicBookingSlotsResponse> {
    return withBookingTenant(this.prisma, referralCode, async (clinic) => {
      const parsed = publicBookingSlotsQuerySchema.safeParse(rawQuery);
      if (!parsed.success) {
        throw new BadRequestException('Invalid slot query');
      }

      const { doctorId, date, rangeStart, rangeEnd } = parsed.data;
      const resolvedDoctorId = doctorId === 'any' ? undefined : doctorId;

      if (resolvedDoctorId) {
        const belongs = await this.doctorBelongsToClinic(
          resolvedDoctorId,
          clinic.id,
        );
        if (!belongs) {
          throw new BadRequestException(
            'Doctor is not available at this clinic',
          );
        }
      }

      const { slots, slotListEmptyReason } =
        await this.slotGeneration.getAvailableSlotsWithMeta(
          clinic.id,
          date,
          resolvedDoctorId,
        );
      const filtered = slots.filter((s) => {
        if (rangeStart && s.time < rangeStart) return false;
        if (rangeEnd && s.endTime > rangeEnd) return false;
        return true;
      });

      const mapped = filtered.map((s) => ({
        doctorId: s.doctorId,
        doctorName: s.doctorName,
        specialization: s.specialization,
        startTime: this.buildSlotIso(date, s.time),
        endTime: this.buildSlotIso(date, s.endTime),
        isAvailable: s.isAvailable,
      }));
      return {
        slots: mapped,
        ...(mapped.length === 0 && slotListEmptyReason
          ? { slotListEmptyReason }
          : {}),
      };
    });
  }

  async assertRequestedSlotIsPubliclyBookable(
    clinicId: string,
    doctorId: string,
    slotCalendarDate: string,
    requestedStart: Date,
    requestedEnd: Date,
  ): Promise<void> {
    const SLOT_MATCH_TOLERANCE_MS = 120_000;
    const slots = await this.slotGeneration.getAvailableSlots(
      clinicId,
      slotCalendarDate,
      doctorId,
    );
    const startMs = requestedStart.getTime();
    const endMs = requestedEnd.getTime();
    const match = slots.some((s) => {
      if (s.doctorId !== doctorId || !s.isAvailable) return false;
      const slotStartMs = this.buildSlotStartDate(
        slotCalendarDate,
        s.time,
      ).getTime();
      const slotEndMs = this.buildSlotStartDate(
        slotCalendarDate,
        s.endTime,
      ).getTime();
      return (
        Math.abs(slotStartMs - startMs) <= SLOT_MATCH_TOLERANCE_MS &&
        Math.abs(slotEndMs - endMs) <= SLOT_MATCH_TOLERANCE_MS
      );
    });
    if (!match) {
      throw new BadRequestException('Selected slot is no longer available');
    }
  }
}
