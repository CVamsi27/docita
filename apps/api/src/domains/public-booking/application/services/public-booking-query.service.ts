import { Injectable, Inject } from '@nestjs/common';
import type {
  PublicBookingClinicResponse,
  PublicBookingContextResponse,
  PublicBookingDoctorsResponse,
  PublicBookingSlotsResponse,
} from '@workspace/types';
import {
  PUBLIC_BOOKING_PERSISTENCE_PORT,
  type PublicBookingPersistencePort,
} from '@/domains/public-booking/application/ports/public-booking-persistence.port';
import { DoctorsService } from '@/domains/doctors/application/services/doctors.service';
import { SlotGenerationService } from '@/domains/doctors/application/services/slot-generation.service';
import { PublicBookingSlotsService } from './public-booking-slots.service';
import { PublicBookingCreationService } from './public-booking-creation.service';

/**
 * Read-only operations for public booking.
 * Delegates to focused sub-services for slot queries and booking context.
 */
@Injectable()
export class PublicBookingQueryService {
  constructor(
    @Inject(PUBLIC_BOOKING_PERSISTENCE_PORT)
    private readonly persistence: PublicBookingPersistencePort,
    private readonly doctorsService: DoctorsService,
    private readonly slotGeneration: SlotGenerationService,
    private readonly slotsService: PublicBookingSlotsService,
    private readonly creationService: PublicBookingCreationService,
  ) {}

  async getClinicSummary(
    referralCode: string,
  ): Promise<PublicBookingClinicResponse> {
    return this.slotsService.getClinicSummary(referralCode);
  }

  async listDoctors(
    referralCode: string,
  ): Promise<PublicBookingDoctorsResponse> {
    return this.slotsService.listDoctors(referralCode);
  }

  async listSlots(
    referralCode: string,
    rawQuery: unknown,
  ): Promise<PublicBookingSlotsResponse> {
    return this.slotsService.listSlots(referralCode, rawQuery);
  }

  async getBookingContext(
    referralCode: string,
    authHeader: string | undefined,
  ): Promise<PublicBookingContextResponse> {
    return this.creationService.getBookingContext(referralCode, authHeader);
  }
}
