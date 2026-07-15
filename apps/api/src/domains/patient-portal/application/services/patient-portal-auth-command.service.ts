import {
  Injectable,
  UnauthorizedException,
  Logger,
  Inject,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import {
  WHATSAPP_CLIENT_TOKEN,
  type IWhatsAppClient,
} from '@/domains/whatsapp/application/ports/whatsapp-client.port';
import { AuthService } from '@/shared/modules/auth/auth/auth.service';
import { nanoid } from 'nanoid';
import {
  IPatientPortalRepository,
  PATIENT_PORTAL_REPOSITORY_TOKEN,
} from '@/domains/patient-portal/core/repositories/patient-portal.repository.interface';
import * as crypto from 'crypto';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { getPatientFullName, normalizePhoneE164 } from '@workspace/utils';

@Injectable()
export class PatientPortalAuthCommandService {
  private readonly logger = new Logger(PatientPortalAuthCommandService.name);

  constructor(
    @Inject(PATIENT_PORTAL_REPOSITORY_TOKEN)
    private readonly repository: IPatientPortalRepository,
    private readonly authService: AuthService,
    @Inject(WHATSAPP_CLIENT_TOKEN)
    private readonly whatsappClient: IWhatsAppClient,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async requestOtp(phoneNumber: string) {
    const normalizedPhone = this.normalizePhone(phoneNumber);

    const patient = await this.repository.findPatientByPhone(normalizedPhone);

    if (patient) {
      const otp = crypto.randomInt(100000, 999999).toString();
      const otpHash = await bcrypt.hash(otp, 10);
      const expiresAt = new Date(this.clock.now().getTime() + 10 * 60 * 1000);

      await this.repository.invalidateOtps(normalizedPhone);
      await this.repository.createOtp({
        phoneNumber: normalizedPhone,
        otpHash,
        expiresAt,
      });

      try {
        await this.whatsappClient.sendMessage({
          to: normalizedPhone,
          templateName: 'patient_login_otp',
          languageCode: 'en',
          components: [
            {
              type: 'body',
              parameters: [{ type: 'text', text: otp }],
            },
          ],
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
    const now = this.clock.now();

    const otpRecord = await this.repository.findActiveOtp(normalizedPhone, now);

    if (!otpRecord) throw new UnauthorizedException('Invalid or expired OTP');

    await this.repository.incrementOtpAttempts(otpRecord.id);

    if (otpRecord.attempts >= 3)
      throw new UnauthorizedException(
        'Too many attempts. Please request a new OTP.',
      );

    const isValid = await bcrypt.compare(otp, otpRecord.otpHash);
    if (!isValid) throw new UnauthorizedException('Invalid OTP');

    await this.repository.markOtpUsed(otpRecord.id);

    const patientWithUser =
      await this.repository.findPatientWithUserByPhone(normalizedPhone);

    if (!patientWithUser) throw new UnauthorizedException('Patient not found');

    let user = patientWithUser.user;

    if (!user) {
      const portalEmail = `portal_${nanoid(8)}@portal.docita.internal`;
      const portalPassword = await bcrypt.hash(nanoid(32), 10);
      const patientName = getPatientFullName(patientWithUser).trim();

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

  // Delegated to the shared @workspace/utils helper so this command service
  // and public-booking stay byte-identical on what "normalized" means.
  private normalizePhone(phone: string): string {
    return normalizePhoneE164(phone);
  }
}
