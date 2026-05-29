import { BadRequestException, Injectable, Inject } from '@nestjs/common';
import type {
  PublicBookingClinicResponse,
  PublicBookingDoctorsResponse,
  PublicBookingSlotsResponse,
} from '@workspace/types';
import { publicBookingSlotsQuerySchema } from '@workspace/types';
import { fromLocalISOString } from '@workspace/utils';
import {
  PUBLIC_BOOKING_PERSISTENCE_PORT,
  type PublicBookingPersistencePort,
} from '@/domains/public-booking/application/ports/public-booking-persistence.port';
import { DoctorsService } from '@/domains/doctors/application/services/doctors.service';
import { SlotGenerationService } from '@/domains/doctors/application/services/slot-generation.service';
import {
  resolveClinicByReferralCode,
  withBookingTenant,
} from './public-booking-utils';

@Injectable()
export class PublicBookingSlotsService {
  constructor(
    @Inject(PUBLIC_BOOKING_PERSISTENCE_PORT)
    private readonly persistence: PublicBookingPersistencePort,
    private readonly doctorsService: DoctorsService,
    private readonly slotGeneration: SlotGenerationService,
  ) {}

  async getClinicSummary(
    referralCode: string,
  ): Promise<PublicBookingClinicResponse> {
    return resolveClinicByReferralCode(this.persistence, referralCode);
  }

  async listDoctors(
    referralCode: string,
  ): Promise<PublicBookingDoctorsResponse> {
    return withBookingTenant(this.persistence, referralCode, async (clinic) => {
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

  buildSlotStartDate(
    slotCalendarDate: string,
    time: string,
    timezone: string,
  ): Date {
    const instant = fromLocalISOString(`${slotCalendarDate}T${time}`, {
      timezone,
    });
    if (!instant) {
      throw new BadRequestException('Invalid slot time');
    }
    return instant;
  }

  buildSlotIso(
    slotCalendarDate: string,
    time: string,
    timezone: string,
  ): string {
    return this.buildSlotStartDate(slotCalendarDate, time, timezone).toISOString();
  }

  private async doctorBelongsToClinic(
    doctorId: string,
    clinicId: string,
  ): Promise<boolean> {
    const [directUser, linkedClinic] = await Promise.all([
      this.persistence.user.count({
        where: {
          id: doctorId,
          clinicId,
          role: { in: ['DOCTOR', 'ADMIN_DOCTOR'] },
        },
      }),
      this.persistence.doctorClinic.count({
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
    return withBookingTenant(this.persistence, referralCode, async (clinic) => {
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
        startTime: this.buildSlotIso(date, s.time, clinic.timezone),
        endTime: this.buildSlotIso(date, s.endTime, clinic.timezone),
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
    timezone: string,
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
        timezone,
      ).getTime();
      const slotEndMs = this.buildSlotStartDate(
        slotCalendarDate,
        s.endTime,
        timezone,
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
