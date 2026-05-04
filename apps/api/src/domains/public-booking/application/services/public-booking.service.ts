import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
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
  patientDomainCreateSchema,
  patientDomainUpdateSchema,
  publicBookingOtpVerifySchema,
  publicBookingPhoneCheckRequestSchema,
  publicBookingSubmitRequestSchema,
} from '@workspace/types';
import { PrismaService } from '@/prisma/prisma.service';
import { DoctorsService } from '@/domains/doctors/application/services/doctors.service';
import { SlotGenerationService } from '@/domains/doctors/application/services/slot-generation.service';
import { PatientService } from '@/domains/patients/application/services/patient.service';
import { AppointmentRequestService } from '@/domains/appointments/application/services/appointment-request.service';
import { WhatsappClientService } from '@/shared/modules/messaging/whatsapp/whatsapp-client.service';
import {
  PublicBookingTokenService,
  PUBLIC_BOOKING_JWT_PURPOSE,
} from '@/domains/public-booking/application/services/public-booking-token.service';
import { TurnstileVerifyService } from '@/domains/public-booking/application/services/turnstile-verify.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { runWithTenant } from '@/common/middleware/tenant.middleware';

const SLOT_MATCH_TOLERANCE_MS = 120_000;

type ResolvedPublicBookingClinic = {
  id: string;
  name: string;
  referralCode: string;
  timezone: string;
};

@Injectable()
export class PublicBookingService {
  private readonly logger = new Logger(PublicBookingService.name);

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

  private async resolveClinicByReferralCode(referralCode: string): Promise<{
    id: string;
    name: string;
    referralCode: string;
    timezone: string;
  }> {
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
    return this.resolveClinicByReferralCode(referralCode);
  }

  async listDoctors(
    referralCode: string,
  ): Promise<PublicBookingDoctorsResponse> {
    return this.withBookingTenant(referralCode, async (clinic) => {
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

  private buildSlotStartDate(slotCalendarDate: string, time: string): Date {
    const [y, mo, d] = slotCalendarDate.split('-').map((v) => parseInt(v, 10));
    const [hh, mm] = time.split(':').map((v) => parseInt(v, 10));
    return new Date(y, mo - 1, d, hh, mm, 0, 0);
  }

  private buildSlotIso(slotCalendarDate: string, time: string): string {
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
    doctorId: string,
    date: string,
  ): Promise<PublicBookingSlotsResponse> {
    return this.withBookingTenant(referralCode, async (clinic) => {
      const belongs = await this.doctorBelongsToClinic(doctorId, clinic.id);
      if (!belongs) {
        throw new BadRequestException('Doctor is not available at this clinic');
      }

      const slots = await this.slotGeneration.getAvailableSlots(
        clinic.id,
        date,
        doctorId,
      );
      return {
        slots: slots.map((s) => ({
          doctorId: s.doctorId,
          doctorName: s.doctorName,
          specialization: s.specialization,
          startTime: this.buildSlotIso(date, s.time),
          endTime: this.buildSlotIso(date, s.endTime),
          isAvailable: s.isAvailable,
        })),
      };
    });
  }

  async checkPhoneStatus(
    referralCode: string,
    rawBody: unknown,
    remoteIp?: string,
  ): Promise<PublicBookingPhoneCheckResponse> {
    const body = publicBookingPhoneCheckRequestSchema.parse(rawBody);
    const ok = await this.turnstile.verifyToken(body.turnstileToken, remoteIp);
    if (this.appConfig.isTurnstileEnforced() && !ok) {
      throw new UnauthorizedException('Verification failed');
    }
    const phone = this.normalizePhone(body.phoneNumber);
    return this.withBookingTenant(referralCode, async (clinic) => {
      const existing = await this.patientService.findByClinicIdAndPhoneNumber(
        clinic.id,
        phone,
      );
      return { requiresOtp: Boolean(existing) };
    });
  }

  async requestOtp(
    referralCode: string,
    rawBody: unknown,
    remoteIp?: string,
  ): Promise<{ message: string; expiresInSeconds: number }> {
    const body = publicBookingPhoneCheckRequestSchema.parse(rawBody);
    const ok = await this.turnstile.verifyToken(body.turnstileToken, remoteIp);
    if (this.appConfig.isTurnstileEnforced() && !ok) {
      throw new UnauthorizedException('Verification failed');
    }
    const phone = this.normalizePhone(body.phoneNumber);
    await this.withBookingTenant(referralCode, async (clinic) => {
      const patient = await this.patientService.findByClinicIdAndPhoneNumber(
        clinic.id,
        phone,
      );

      if (patient) {
        const otp = crypto.randomInt(100000, 999999).toString();
        const otpHash = await bcrypt.hash(otp, 10);
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        await this.prisma.publicBookingOtp.deleteMany({
          where: { clinicId: clinic.id, phoneNumber: phone, usedAt: null },
        });

        await this.prisma.publicBookingOtp.create({
          data: {
            clinicId: clinic.id,
            phoneNumber: phone,
            otpHash,
            expiresAt,
          },
        });

        try {
          await this.whatsappClient.sendMessage({
            to: phone,
            message: `Your verification code for booking at ${clinic.name} is: ${otp}. Valid for 10 minutes.`,
          });
        } catch (error) {
          this.logger.warn(
            'Failed to send public booking OTP WhatsApp',
            error instanceof Error ? error.message : 'unknown',
          );
        }
      }
    });

    return {
      message:
        'If this number is registered at this clinic, a verification code has been sent.',
      expiresInSeconds: 600,
    };
  }

  async verifyOtp(
    referralCode: string,
    rawBody: unknown,
  ): Promise<PublicBookingOtpVerifyResponse> {
    const body = publicBookingOtpVerifySchema.parse(rawBody);
    const phone = this.normalizePhone(body.phoneNumber);
    return this.withBookingTenant(referralCode, async (clinic) => {
      const now = new Date();

      const otpRecord = await this.prisma.publicBookingOtp.findFirst({
        where: {
          clinicId: clinic.id,
          phoneNumber: phone,
          expiresAt: { gt: now },
          usedAt: null,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!otpRecord) {
        throw new UnauthorizedException('Invalid or expired code');
      }

      await this.prisma.publicBookingOtp.update({
        where: { id: otpRecord.id },
        data: { attempts: { increment: 1 } },
      });

      const refreshed = await this.prisma.publicBookingOtp.findUnique({
        where: { id: otpRecord.id },
      });
      if (!refreshed || refreshed.attempts > 3) {
        throw new UnauthorizedException(
          'Too many attempts. Please request a new code.',
        );
      }

      const isValid = await bcrypt.compare(body.otp, refreshed.otpHash);
      if (!isValid) {
        throw new UnauthorizedException('Invalid code');
      }

      await this.prisma.publicBookingOtp.update({
        where: { id: otpRecord.id },
        data: { usedAt: new Date() },
      });

      const patient = await this.patientService.findByClinicIdAndPhoneNumber(
        clinic.id,
        phone,
      );
      if (!patient) {
        throw new UnauthorizedException('Patient not found');
      }

      const plain = patient.toPlain();

      const token = this.bookingTokenService.sign({
        purpose: PUBLIC_BOOKING_JWT_PURPOSE,
        clinicId: clinic.id,
        patientId: patient.id,
        phoneNumber: phone,
      });

      return {
        bookingVerificationToken: token,
        patient: {
          firstName: plain.firstName,
          lastName: plain.lastName,
          email: plain.email,
        },
      };
    });
  }

  async getBookingContext(
    referralCode: string,
    authHeader: string | undefined,
  ): Promise<PublicBookingContextResponse> {
    const token = this.extractBearerToken(authHeader);
    if (!token) {
      throw new UnauthorizedException('Verification required');
    }
    const payload = this.bookingTokenService.verify(token);
    return this.withBookingTenant(referralCode, async (clinic) => {
      if (payload.clinicId !== clinic.id) {
        throw new UnauthorizedException('Invalid verification context');
      }

      const appointments = await this.prisma.appointment.findMany({
        where: { clinicId: clinic.id, patientId: payload.patientId },
        orderBy: { startTime: 'desc' },
        take: 5,
        select: {
          id: true,
          startTime: true,
          endTime: true,
          status: true,
          doctor: { select: { name: true } },
        },
      });

      const patient = await this.prisma.patient.findFirst({
        where: { id: payload.patientId, clinicId: clinic.id },
        select: { createdAt: true },
      });

      return {
        appointments: appointments.map((a) => ({
          id: a.id,
          startTime: a.startTime.toISOString(),
          endTime: a.endTime.toISOString(),
          doctorName: a.doctor.name,
          status: a.status,
        })),
        patientSince: patient?.createdAt.toISOString(),
      };
    });
  }

  private extractBearerToken(header: string | undefined): string | null {
    if (!header) return null;
    const m = /^Bearer\s+(.+)$/i.exec(header.trim());
    return m?.[1] ?? null;
  }

  private async assertRequestedSlotIsPubliclyBookable(
    clinicId: string,
    doctorId: string,
    slotCalendarDate: string,
    requestedStart: Date,
    requestedEnd: Date,
  ): Promise<void> {
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

  async submitRequest(
    referralCode: string,
    rawBody: unknown,
    authHeader: string | undefined,
    remoteIp?: string,
  ): Promise<PublicBookingSubmitResponse> {
    const data = publicBookingSubmitRequestSchema.parse(rawBody);

    const turnstileOk = await this.turnstile.verifyToken(
      data.turnstileToken,
      remoteIp,
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

      const requestedStart = new Date(data.requestedSlotStart);
      const requestedEnd = new Date(data.requestedSlotEnd);
      if (
        Number.isNaN(requestedStart.getTime()) ||
        Number.isNaN(requestedEnd.getTime()) ||
        requestedEnd <= requestedStart
      ) {
        throw new BadRequestException('Invalid requested slot');
      }

      await this.assertRequestedSlotIsPubliclyBookable(
        clinic.id,
        data.preferredDoctorId,
        data.slotCalendarDate,
        requestedStart,
        requestedEnd,
      );

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
        const created = await this.patientService.createPatient(
          patientDomainCreateSchema.parse({
            clinicId: clinic.id,
            firstName: data.firstName,
            lastName: data.lastName,
            phoneNumber: phone,
            gender: 'PREFER_NOT_TO_SAY',
            email: data.email,
          }),
        );
        patientId = created.id;
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
