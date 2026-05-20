import {
  Injectable,
  Logger,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import {
  publicBookingOtpVerifySchema,
  publicBookingPhoneCheckRequestSchema,
  type PublicBookingContextResponse,
  type PublicBookingOtpVerifyResponse,
  type PublicBookingPhoneCheckResponse,
} from '@workspace/types';
import {
  PUBLIC_BOOKING_PERSISTENCE_PORT,
  type PublicBookingPersistencePort,
} from '@/domains/public-booking/application/ports/public-booking-persistence.port';
import { PatientService } from '@/domains/patients/application/services/patient.service';
import {
  WHATSAPP_CLIENT_TOKEN,
  type IWhatsAppClient,
} from '@/domains/whatsapp/application/ports/whatsapp-client.port';
import {
  PublicBookingTokenService,
  PUBLIC_BOOKING_JWT_PURPOSE,
} from '@/domains/public-booking/application/services/public-booking-token.service';
import { TurnstileVerifyService } from '@/domains/public-booking/application/services/turnstile-verify.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import {
  extractBearerToken,
  normalizePhone,
  withBookingTenant,
} from './public-booking-utils';
import {
  CLOCK_PORT,
  type IClock,
} from '@/shared/common/ports/clock.port';

@Injectable()
export class PublicBookingCreationService {
  private readonly logger = new Logger(PublicBookingCreationService.name);

  constructor(
    @Inject(PUBLIC_BOOKING_PERSISTENCE_PORT)
    private readonly persistence: PublicBookingPersistencePort,
    private readonly patientService: PatientService,
    @Inject(WHATSAPP_CLIENT_TOKEN)
    private readonly whatsappClient: IWhatsAppClient,
    private readonly bookingTokenService: PublicBookingTokenService,
    private readonly turnstile: TurnstileVerifyService,
    private readonly appConfig: AppConfigService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  private async issueAndSendOtp(
    clinicId: string,
    clinicName: string,
    phone: string,
  ): Promise<void> {
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(this.clock.now().getTime() + 10 * 60 * 1000);
    await this.persistence.publicBookingOtp.deleteMany({
      where: { clinicId, phoneNumber: phone, usedAt: null },
    });
    await this.persistence.publicBookingOtp.create({
      data: { clinicId, phoneNumber: phone, otpHash, expiresAt },
    });
    try {
      await this.whatsappClient.sendMessage({
        to: phone,
        text: `Your verification code for booking at ${clinicName} is: ${otp}. Valid for 10 minutes.`,
      });
    } catch (error) {
      this.logger.warn(
        'Failed to send public booking OTP WhatsApp',
        error instanceof Error ? error.message : 'unknown',
      );
    }
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
    const phone = normalizePhone(body.phoneNumber);
    return withBookingTenant(this.persistence, referralCode, async (clinic) => {
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
    const phone = normalizePhone(body.phoneNumber);
    await withBookingTenant(this.persistence, referralCode, async (clinic) => {
      const patient = await this.patientService.findByClinicIdAndPhoneNumber(
        clinic.id,
        phone,
      );
      if (patient) {
        await this.issueAndSendOtp(clinic.id, clinic.name, phone);
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
    const phone = normalizePhone(body.phoneNumber);
    return withBookingTenant(this.persistence, referralCode, async (clinic) => {
      const now = this.clock.now();

      const otpRecord = await this.persistence.publicBookingOtp.findFirst({
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

      await this.persistence.publicBookingOtp.update({
        where: { id: otpRecord.id },
        data: { attempts: { increment: 1 } },
      });

      const refreshed = await this.persistence.publicBookingOtp.findUnique({
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

      await this.persistence.publicBookingOtp.update({
        where: { id: otpRecord.id },
        data: { usedAt: this.clock.now() },
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
    const token = extractBearerToken(authHeader);
    if (!token) {
      throw new UnauthorizedException('Verification required');
    }
    const payload = this.bookingTokenService.verify(token);
    return withBookingTenant(this.persistence, referralCode, async (clinic) => {
      if (payload.clinicId !== clinic.id) {
        throw new UnauthorizedException('Invalid verification context');
      }

      const appointments = await this.persistence.appointment.findMany({
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

      const patient = await this.persistence.patient.findFirst({
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
}
