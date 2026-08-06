import { getPatientFullName } from '@workspace/utils';
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import {
  DPDP_NOTICE_VERSION,
  patientDomainCreateSchema,
  patientDomainUpdateSchema,
  publicBookingSubmitRequestSchema,
  type PublicBookingSubmitResponse,
} from '@workspace/types';
import {
  PUBLIC_BOOKING_PERSISTENCE_PORT,
  type PublicBookingPersistencePort,
} from '@/domains/public-booking/application/ports/public-booking-persistence.port';
import { PatientService } from '@/domains/patients/application/services/patient.service';
import { DPDPComplianceService } from '@/shared/modules/compliance/dpdp-compliance.service';
import { AppointmentRequestService } from '@/domains/appointments/application/services/appointment-request.service';
import { PublicBookingTokenService } from '@/domains/public-booking/application/services/public-booking-token.service';
import { TurnstileVerifyService } from '@/shared/modules/turnstile/turnstile-verify.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import {
  extractBearerToken,
  normalizePhone,
  withBookingTenant,
} from './public-booking-utils';
import { PublicBookingSlotsService } from './public-booking-slots.service';

type SubmitData = ReturnType<typeof publicBookingSubmitRequestSchema.parse>;

@Injectable()
export class PublicBookingSubmitService {
  constructor(
    @Inject(PUBLIC_BOOKING_PERSISTENCE_PORT)
    private readonly persistence: PublicBookingPersistencePort,
    private readonly patientService: PatientService,
    private readonly appointmentRequestService: AppointmentRequestService,
    private readonly bookingTokenService: PublicBookingTokenService,
    private readonly turnstile: TurnstileVerifyService,
    private readonly appConfig: AppConfigService,
    private readonly dpdpService: DPDPComplianceService,
    private readonly slotsService: PublicBookingSlotsService,
  ) {}

  private async updateExistingPatient(
    patientId: string,
    clinicId: string,
    phone: string,
    data: SubmitData,
  ): Promise<string> {
    await this.patientService.updatePatient(
      patientId,
      patientDomainUpdateSchema.parse({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phoneNumber: phone,
      }),
      clinicId,
    );
    return patientId;
  }

  private async registerNewPatient(
    clinicId: string,
    phone: string,
    data: SubmitData,
    remoteIp: string | undefined,
    userAgent: string | undefined,
  ): Promise<string> {
    if (!data.dateOfBirth)
      throw new BadRequestException(
        'Date of birth is required when this phone number is not already on file at this clinic',
      );
    if (!data.dpdpConsent || data.dpdpConsent.accepted !== true)
      throw new BadRequestException(
        'Consent to process your personal data under the DPDP Act, 2023 is required to register at this clinic.',
      );
    if (data.dpdpConsent.noticeVersion !== DPDP_NOTICE_VERSION)
      throw new BadRequestException(
        'The privacy notice has been updated. Please refresh the page and accept the new notice before submitting.',
      );
    const created = await this.patientService.createPatient(
      patientDomainCreateSchema.parse({
        clinicId,
        firstName: data.firstName,
        lastName: data.lastName,
        phoneNumber: phone,
        gender: 'PREFER_NOT_TO_SAY',
        email: data.email,
        dateOfBirth: data.dateOfBirth,
      }),
    );
    await this.dpdpService.recordDpdpNoticeConsent({
      patientId: created.id,
      clinicId,
      noticeVersion: data.dpdpConsent.noticeVersion,
      givenByName:
        data.dpdpConsent.givenByName ?? getPatientFullName(data).trim(),
      givenByRelation: data.dpdpConsent.relation ?? 'SELF',
      createdBy: undefined,
      ipAddress: remoteIp,
      userAgent,
      notes: 'Collected by patient via public /book page',
    });
    // jscpd:ignore-start
    return created.id;
  }

  async submitRequest(
    referralCode: string,
    rawBody: unknown,
    authHeader: string | undefined,
    remoteIp?: string,
    userAgent?: string,
  ): Promise<PublicBookingSubmitResponse> {
    const data = publicBookingSubmitRequestSchema.parse(rawBody);
    // jscpd:ignore-end

    const turnstileOk = await this.turnstile.verifyToken(
      data.turnstileToken,
      remoteIp,
    );
    if (this.appConfig.isTurnstileEnforced() && !turnstileOk) {
      throw new UnauthorizedException('Verification failed');
    }

    const phone = normalizePhone(data.phoneNumber);
    return withBookingTenant(this.persistence, referralCode, async (clinic) => {
      const existing = await this.patientService.findByClinicIdAndPhoneNumber(
        clinic.id,
        phone,
      );

      if (existing) {
        const token =
          extractBearerToken(authHeader) ?? data.bookingVerificationToken;
        if (!token)
          throw new UnauthorizedException(
            'Booking verification is required for this phone number',
          );
        const payload = this.bookingTokenService.verify(token);
        if (
          payload.clinicId !== clinic.id ||
          payload.patientId !== existing.id ||
          payload.phoneNumber !== phone
        )
          throw new UnauthorizedException('Invalid booking verification');
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
        if (!requestedStart || !requestedEnd)
          throw new BadRequestException('Invalid requested slot');
        if (
          Number.isNaN(requestedStart.getTime()) ||
          Number.isNaN(requestedEnd.getTime()) ||
          requestedEnd <= requestedStart
        ) {
          throw new BadRequestException('Invalid requested slot');
        }
        if (!data.preferredDoctorId)
          throw new BadRequestException(
            'preferredDoctorId is required when selecting a time slot',
          );
        await this.slotsService.assertRequestedSlotIsPubliclyBookable(
          clinic.id,
          data.preferredDoctorId,
          data.slotCalendarDate,
          requestedStart,
          requestedEnd,
          clinic.timezone,
        );
      }

      const patientId = existing
        ? await this.updateExistingPatient(existing.id, clinic.id, phone, data)
        : await this.registerNewPatient(
            clinic.id,
            phone,
            data,
            remoteIp,
            userAgent,
          );

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
