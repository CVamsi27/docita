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
import {
  DPDP_NOTICE_VERSION,
  patientDomainCreateSchema,
  patientDomainUpdateSchema,
  publicBookingOtpVerifySchema,
  publicBookingPhoneCheckRequestSchema,
  publicBookingSlotsQuerySchema,
  publicBookingSubmitRequestSchema,
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
    private readonly dpdpService: DPDPComplianceService,
  ) {}

  private normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) {
      return `+91${digits}`;
    }
    if (digits.length === 12 && digits.startsWith('91')) {
      return `+${digits}`;
    }
    return phone.startsWith('+') ? phone : `+${digits}`;
  }

  private readFacilityLabelFromSettings(
    settings: unknown,
  ): 'CLINIC' | 'HOSPITAL' | undefined {
    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
      return undefined;
    }
    const raw = (settings as Record<string, unknown>).facilityLabel;
    return raw === 'HOSPITAL' || raw === 'CLINIC' ? raw : undefined;
  }

  private async resolveClinicByReferralCode(
    referralCode: string,
  ): Promise<PublicBookingClinicResponse> {
    const normalized = referralCode.trim().toUpperCase();
    const clinic = await this.prisma.clinic.findFirst({
      where: {
        referralCode: normalized,
        active: true,
      },
      select: {
        id: true,
        name: true,
        referralCode: true,
        timezone: true,
        address: true,
        phone: true,
        email: true,
        website: true,
        settings: true,
      },
    });
    if (!clinic?.referralCode) {
      throw new NotFoundException('Clinic not found');
    }
    return {
      id: clinic.id,
      name: clinic.name,
      referralCode: clinic.referralCode,
      timezone: clinic.timezone,
      address: clinic.address,
      phone: clinic.phone,
      email: clinic.email,
      website: clinic.website ?? undefined,
      facilityLabel: this.readFacilityLabelFromSettings(clinic.settings),
    };
  }

  /**
   * Public booking routes have no authenticated tenant; Prisma tenant
   * extension still requires clinic scope for clinic-scoped models.
   */
  private async withBookingTenant<T>(
    referralCode: string,
    fn: (clinic: ResolvedPublicBookingClinic) => Promise<T>,
  ): Promise<T> {
    const clinic = await this.resolveClinicByReferralCode(referralCode);
    return await runWithTenant({ clinicId: clinic.id }, async () => fn(clinic));
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
    if (this.appConfig.isTurnstileEnforced() && !turnstileOk) {
      throw new UnauthorizedException('Verification failed');
    }

    const phone = this.normalizePhone(data.phoneNumber);
    return this.withBookingTenant(referralCode, async (clinic) => {
      const existing = await this.patientService.findByClinicIdAndPhoneNumber(
        clinic.id,
        phone,
      );

      if (existing) {
        const token =
          this.extractBearerToken(authHeader) ?? data.bookingVerificationToken;
        if (!token) {
          throw new UnauthorizedException(
            'Booking verification is required for this phone number',
          );
        }
        const payload = this.bookingTokenService.verify(token);
        if (
          payload.clinicId !== clinic.id ||
          payload.patientId !== existing.id ||
          payload.phoneNumber !== phone
        ) {
          throw new UnauthorizedException('Invalid booking verification');
        }
      } else if (data.bookingVerificationToken) {
        throw new BadRequestException('Unexpected booking verification token');
      }

      const requestedStart = data.requestedSlotStart
        ? new Date(data.requestedSlotStart)
        : null;
      const requestedEnd = data.requestedSlotEnd
        ? new Date(data.requestedSlotEnd)
        : null;

      if (requestedStart || requestedEnd) {
        if (!requestedStart || !requestedEnd) {
          throw new BadRequestException('Invalid requested slot');
        }
        if (
          Number.isNaN(requestedStart.getTime()) ||
          Number.isNaN(requestedEnd.getTime()) ||
          requestedEnd <= requestedStart
        ) {
          throw new BadRequestException('Invalid requested slot');
        }
        if (!data.preferredDoctorId) {
          throw new BadRequestException(
            'preferredDoctorId is required when selecting a time slot',
          );
        }

        await this.assertRequestedSlotIsPubliclyBookable(
          clinic.id,
          data.preferredDoctorId,
          data.slotCalendarDate,
          requestedStart,
          requestedEnd,
        );
      }

      let patientId: string;
      if (existing) {
        await this.patientService.updatePatient(
          existing.id,
          patientDomainUpdateSchema.parse({
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            phoneNumber: phone,
          }),
          clinic.id,
        );
        patientId = existing.id;
      } else {
        if (!data.dateOfBirth) {
          throw new BadRequestException(
            'Date of birth is required when this phone number is not already on file at this clinic',
          );
        }
        if (!data.dpdpConsent || data.dpdpConsent.accepted !== true) {
          throw new BadRequestException(
            'Consent to process your personal data under the DPDP Act, 2023 is required to register at this clinic.',
          );
        }
        if (data.dpdpConsent.noticeVersion !== DPDP_NOTICE_VERSION) {
          throw new BadRequestException(
            'The privacy notice has been updated. Please refresh the page and accept the new notice before submitting.',
          );
        }
        const created = await this.patientService.createPatient(
          patientDomainCreateSchema.parse({
            clinicId: clinic.id,
            firstName: data.firstName,
            lastName: data.lastName,
            phoneNumber: phone,
            gender: 'PREFER_NOT_TO_SAY',
            email: data.email,
            dateOfBirth: data.dateOfBirth,
          }),
        );
        patientId = created.id;

        await this.dpdpService.recordDpdpNoticeConsent({
          patientId: created.id,
          clinicId: clinic.id,
          noticeVersion: data.dpdpConsent.noticeVersion,
          givenByName:
            data.dpdpConsent.givenByName ??
            `${data.firstName} ${data.lastName}`.trim(),
          givenByRelation: data.dpdpConsent.relation ?? 'SELF',
          createdBy: undefined,
          ipAddress: remoteIp,
          userAgent,
          notes: 'Collected by patient via public /book page',
        });
      }

      const reason =
        data.reason && data.reason.trim().length >= 2
          ? data.reason
          : 'Online booking request';

      const createdRequest =
        await this.appointmentRequestService.createPatientRequest(
          patientId,
          clinic.id,
          {
            preferredDoctorId: data.preferredDoctorId,
            preferredDate: data.slotCalendarDate,
            preferredTime: undefined,
            requestedSlotStart: data.requestedSlotStart,
            requestedSlotEnd: data.requestedSlotEnd,
            reason,
            notes: data.notes,
          },
        );

      return {
        requestId: createdRequest.id,
        message:
          'Your request has been received. The clinic will confirm your appointment.',
      };
    });
  }
}
