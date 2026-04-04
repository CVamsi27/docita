import {
  Injectable,
  UnauthorizedException,
  Logger,
  Inject,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { WhatsappClientService } from '@/shared/modules/messaging/whatsapp/whatsapp-client.service';
import { AuthService } from '@/shared/modules/auth/auth/auth.service';
import { nanoid } from 'nanoid';
import {
  IPatientPortalRepository,
  PATIENT_PORTAL_REPOSITORY_TOKEN,
} from '@/domains/patient-portal/core/repositories/patient-portal.repository.interface';
import * as crypto from 'crypto';

@Injectable()
export class PatientPortalAuthService {
  private readonly logger = new Logger(PatientPortalAuthService.name);

  constructor(
    @Inject(PATIENT_PORTAL_REPOSITORY_TOKEN)
    private readonly repository: IPatientPortalRepository,
    private readonly authService: AuthService,
    private readonly whatsappClient: WhatsappClientService,
  ) {}

  async requestOtp(phoneNumber: string) {
    const normalizedPhone = this.normalizePhone(phoneNumber);

    const patient = await this.repository.findPatientByPhone(normalizedPhone);

    if (patient) {
      const otp = crypto.randomInt(100000, 999999).toString();
      const otpHash = await bcrypt.hash(otp, 10);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await this.repository.invalidateOtps(normalizedPhone);
      await this.repository.createOtp({
        phoneNumber: normalizedPhone,
        otpHash,
        expiresAt,
      });

      try {
        await this.whatsappClient.sendMessage({
          to: normalizedPhone,
          message: `Your Docita login OTP is: ${otp}. Valid for 10 minutes.`,
        });
      } catch (error) {
        this.logger.warn(
          `Failed to send OTP WhatsApp message to ${normalizedPhone}`,
          error instanceof Error ? error.message : 'Unknown error',
        );
      }
    }

    return {
      message:
        'If a patient account exists for this phone, an OTP has been sent.',
      expiresInSeconds: 600,
    };
  }

  async verifyOtp(phoneNumber: string, otp: string) {
    const normalizedPhone = this.normalizePhone(phoneNumber);
    const now = new Date();

    const otpRecord = await this.repository.findActiveOtp(normalizedPhone, now);

    if (!otpRecord) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    await this.repository.incrementOtpAttempts(otpRecord.id);

    if (otpRecord.attempts >= 3) {
      throw new UnauthorizedException(
        'Too many attempts. Please request a new OTP.',
      );
    }

    const isValid = await bcrypt.compare(otp, otpRecord.otpHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid OTP');
    }

    await this.repository.markOtpUsed(otpRecord.id);

    const patientWithUser =
      await this.repository.findPatientWithUserByPhone(normalizedPhone);

    if (!patientWithUser) {
      throw new UnauthorizedException('Patient not found');
    }

    let user = patientWithUser.user;

    if (!user) {
      const portalEmail = `portal_${nanoid(8)}@portal.docita.internal`;
      const portalPassword = await bcrypt.hash(nanoid(32), 10);
      const patientName =
        `${patientWithUser.firstName} ${patientWithUser.lastName}`.trim();

      user = await this.repository.createPortalUser({
        email: portalEmail,
        password: portalPassword,
        role: 'PATIENT',
        name: patientName,
      });

      await this.repository.linkUserToPatient(patientWithUser.id, user.id);

      this.logger.log('Created portal user account');
    }

    const { password: _password, ...userWithoutPassword } = user;
    return this.authService.login(userWithoutPassword);
  }

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
}
