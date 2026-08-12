import { Injectable, Inject } from '@nestjs/common';
import type {
  PublicBookingClinicResponse,
  PublicBookingContextResponse,
  PublicBookingDoctorsResponse,
  PublicBookingOtpVerifyResponse,
  PublicBookingPhoneCheckResponse,
  PublicBookingSlotsResponse,
  PublicBookingSubmitResponse,
} from '@workspace/types';
import {
  PUBLIC_BOOKING_PERSISTENCE_PORT,
  type PublicBookingPersistencePort,
} from '@/domains/public-booking/application/ports/public-booking-persistence.port';
import { DoctorsService } from '@/domains/doctors/application/services/doctors.service';
import { SlotGenerationService } from '@/domains/doctors/application/services/slot-generation.service';
import { PatientService } from '@/domains/patients/application/services/patient.service';
import { ConsentCommandService } from '@/shared/modules/compliance/consent-command.service';
import { AppointmentRequestService } from '@/domains/appointments/application/services/appointment-request.service';
import {
  WHATSAPP_CLIENT_TOKEN,
  type IWhatsAppClient,
} from '@/domains/whatsapp/application/ports/whatsapp-client.port';
import { PublicBookingTokenService } from '@/domains/public-booking/application/services/public-booking-token.service';
import { TurnstileVerifyService } from '@/shared/modules/turnstile/turnstile-verify.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { PublicBookingSlotsService } from './public-booking-slots.service';
import { PublicBookingCreationService } from './public-booking-creation.service';
import { PublicBookingSubmitService } from './public-booking-submit.service';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';

/**
 * Thin facade — preserves the original constructor signature.
 * Delegates all logic to the focused sub-services.
 */
@Injectable()
export class PublicBookingService {
  private readonly slots: PublicBookingSlotsService;
  private readonly creation: PublicBookingCreationService;
  private readonly submit: PublicBookingSubmitService;

  constructor(
    @Inject(PUBLIC_BOOKING_PERSISTENCE_PORT)
    private readonly persistence: PublicBookingPersistencePort,
    private readonly doctorsService: DoctorsService,
    private readonly slotGeneration: SlotGenerationService,
    private readonly patientService: PatientService,
    private readonly appointmentRequestService: AppointmentRequestService,
    @Inject(WHATSAPP_CLIENT_TOKEN)
    private readonly whatsappClient: IWhatsAppClient,
    private readonly bookingTokenService: PublicBookingTokenService,
    private readonly turnstile: TurnstileVerifyService,
    private readonly appConfig: AppConfigService,
    private readonly consentCompliance: ConsentCommandService,
    @Inject(CLOCK_PORT) clock: IClock,
  ) {
    this.slots = new PublicBookingSlotsService(
      this.persistence,
      doctorsService,
      slotGeneration,
    );
    this.creation = new PublicBookingCreationService(
      this.persistence,
      patientService,
      whatsappClient,
      bookingTokenService,
      turnstile,
      appConfig,
      clock,
    );
    this.submit = new PublicBookingSubmitService(
      this.persistence,
      patientService,
      appointmentRequestService,
      bookingTokenService,
      turnstile,
      appConfig,
      consentCompliance,
      this.slots,
    );
  }

  async getClinicSummary(
    referralCode: string,
  ): Promise<PublicBookingClinicResponse> {
    return this.slots.getClinicSummary(referralCode);
  }

  async listDoctors(
    referralCode: string,
  ): Promise<PublicBookingDoctorsResponse> {
    return this.slots.listDoctors(referralCode);
  }

  async listSlots(
    referralCode: string,
    rawQuery: unknown,
  ): Promise<PublicBookingSlotsResponse> {
    return this.slots.listSlots(referralCode, rawQuery);
  }

  async checkPhoneStatus(
    referralCode: string,
    rawBody: unknown,
    remoteIp?: string,
  ): Promise<PublicBookingPhoneCheckResponse> {
    return this.creation.checkPhoneStatus(referralCode, rawBody, remoteIp);
  }

  async requestOtp(
    referralCode: string,
    rawBody: unknown,
    remoteIp?: string,
  ): Promise<{ message: string; expiresInSeconds: number }> {
    return this.creation.requestOtp(referralCode, rawBody, remoteIp);
  }

  async verifyOtp(
    referralCode: string,
    rawBody: unknown,
  ): Promise<PublicBookingOtpVerifyResponse> {
    return this.creation.verifyOtp(referralCode, rawBody);
  }

  async getBookingContext(
    referralCode: string,
    authHeader: string | undefined,
  ): Promise<PublicBookingContextResponse> {
    // jscpd:ignore-start
    return this.creation.getBookingContext(referralCode, authHeader);
  }

  async submitRequest(
    referralCode: string,
    rawBody: unknown,
    authHeader: string | undefined,
    remoteIp?: string,
    userAgent?: string,
  ): Promise<PublicBookingSubmitResponse> {
    return this.submit.submitRequest(
      // jscpd:ignore-end
      referralCode,
      rawBody,
      authHeader,
      remoteIp,
      userAgent,
    );
  }
}
