import { Injectable } from '@nestjs/common';
import type {
  PublicBookingClinicResponse,
  PublicBookingContextResponse,
  PublicBookingDoctorsResponse,
  PublicBookingOtpVerifyResponse,
  PublicBookingPhoneCheckResponse,
  PublicBookingSlotsResponse,
  PublicBookingSubmitResponse,
} from '@workspace/types';
import { PrismaService } from '@/prisma/prisma.service';
import { DoctorsService } from '@/domains/doctors/application/services/doctors.service';
import { SlotGenerationService } from '@/domains/doctors/application/services/slot-generation.service';
import { PatientService } from '@/domains/patients/application/services/patient.service';
import { DPDPComplianceService } from '@/shared/modules/compliance/dpdp-compliance.service';
import { AppointmentRequestService } from '@/domains/appointments/application/services/appointment-request.service';
import { WhatsappClientService } from '@/shared/modules/messaging/whatsapp/whatsapp-client.service';
import { PublicBookingTokenService } from '@/domains/public-booking/application/services/public-booking-token.service';
import { TurnstileVerifyService } from '@/domains/public-booking/application/services/turnstile-verify.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { PublicBookingSlotsService } from './public-booking-slots.service';
import { PublicBookingCreationService } from './public-booking-creation.service';
import { PublicBookingSubmitService } from './public-booking-submit.service';

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
    private readonly prisma: PrismaService,
    private readonly doctorsService: DoctorsService,
    private readonly slotGeneration: SlotGenerationService,
    private readonly patientService: PatientService,
    private readonly appointmentRequestService: AppointmentRequestService,
    private readonly whatsappClient: WhatsappClientService,
    private readonly bookingTokenService: PublicBookingTokenService,
    private readonly turnstile: TurnstileVerifyService,
    private readonly appConfig: AppConfigService,
    private readonly dpdpService: DPDPComplianceService,
  ) {
    this.slots = new PublicBookingSlotsService(
      prisma,
      doctorsService,
      slotGeneration,
    );
    this.creation = new PublicBookingCreationService(
      prisma,
      patientService,
      whatsappClient,
      bookingTokenService,
      turnstile,
      appConfig,
    );
    this.submit = new PublicBookingSubmitService(
      prisma,
      patientService,
      appointmentRequestService,
      bookingTokenService,
      turnstile,
      appConfig,
      dpdpService,
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
      referralCode,
      rawBody,
      authHeader,
      remoteIp,
      userAgent,
    );
  }
}
