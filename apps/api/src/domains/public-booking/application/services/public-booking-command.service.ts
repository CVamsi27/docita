import { Injectable, Inject } from '@nestjs/common';
import type {
  PublicBookingOtpVerifyResponse,
  PublicBookingPhoneCheckResponse,
  PublicBookingSubmitResponse,
} from '@workspace/types';
import {
  PUBLIC_BOOKING_PERSISTENCE_PORT,
  type PublicBookingPersistencePort,
} from '@/domains/public-booking/application/ports/public-booking-persistence.port';
import { PatientService } from '@/domains/patients/application/services/patient.service';
import { AppointmentRequestService } from '@/domains/appointments/application/services/appointment-request.service';
import { ConsentCommandService } from '@/shared/modules/compliance/consent-command.service';
import { PublicBookingTokenService } from '@/domains/public-booking/application/services/public-booking-token.service';
import { TurnstileVerifyService } from '@/shared/modules/turnstile/turnstile-verify.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { PublicBookingCreationService } from './public-booking-creation.service';
import { PublicBookingSubmitService } from './public-booking-submit.service';
import { PublicBookingSlotsService } from './public-booking-slots.service';
import {
  WHATSAPP_CLIENT_TOKEN,
  type IWhatsAppClient,
} from '@/domains/whatsapp/application/ports/whatsapp-client.port';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';

/**
 * Write operations for public booking.
 * Delegates to focused sub-services for OTP, context, and appointment creation.
 */
@Injectable()
export class PublicBookingCommandService {
  constructor(
    @Inject(PUBLIC_BOOKING_PERSISTENCE_PORT)
    private readonly persistence: PublicBookingPersistencePort,
    private readonly patientService: PatientService,
    private readonly appointmentRequestService: AppointmentRequestService,
    @Inject(WHATSAPP_CLIENT_TOKEN)
    private readonly whatsappClient: IWhatsAppClient,
    private readonly bookingTokenService: PublicBookingTokenService,
    private readonly turnstile: TurnstileVerifyService,
    private readonly appConfig: AppConfigService,
    private readonly consentCompliance: ConsentCommandService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
    private readonly creationService: PublicBookingCreationService,
    private readonly submitService: PublicBookingSubmitService,
    private readonly slotsService: PublicBookingSlotsService,
  ) {}

  async checkPhoneStatus(
    referralCode: string,
    rawBody: unknown,
    remoteIp?: string,
  ): Promise<PublicBookingPhoneCheckResponse> {
    return this.creationService.checkPhoneStatus(referralCode, rawBody, remoteIp);
  }

  async requestOtp(
    referralCode: string,
    rawBody: unknown,
    remoteIp?: string,
  ): Promise<{ message: string; expiresInSeconds: number }> {
    return this.creationService.requestOtp(referralCode, rawBody, remoteIp);
  }

  async verifyOtp(
    referralCode: string,
    rawBody: unknown,
  ): Promise<PublicBookingOtpVerifyResponse> {
    return this.creationService.verifyOtp(referralCode, rawBody);
  }

  async submitRequest(
    referralCode: string,
    rawBody: unknown,
    authHeader: string | undefined,
    remoteIp?: string,
    userAgent?: string,
  ): Promise<PublicBookingSubmitResponse> {
    return this.submitService.submitRequest(
      referralCode,
      rawBody,
      authHeader,
      remoteIp,
      userAgent,
    );
  }
}
