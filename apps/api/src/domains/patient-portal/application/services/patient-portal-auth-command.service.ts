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
import { sendLoginOtp } from '@/shared/whatsapp/whatsapp-login-otp.helper';

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
      // randomInt's max is exclusive, so the upper bound is 1_000_000
      // to actually include 999_999 in the sample space. (Earlier
      // versions used 999_999 which silently biased the OTP away from
      // 999_999 — negligible cryptographically, but a flat 1/900_000
      // bias for no reason.)
      const otp = crypto.randomInt(100000, 1_000_000).toString();
      const otpHash = await bcrypt.hash(otp, 10);
      const expiresAt = new Date(this.clock.now().getTime() + 10 * 60 * 1000);

      await this.repository.invalidateOtps(normalizedPhone);
      await this.repository.createOtp({
        phoneNumber: normalizedPhone,
        otpHash,
        expiresAt,
      });

      await sendLoginOtp(this.whatsappClient, this.logger, 'patient', {
        to: normalizedPhone,
        templateName: 'patient_login_otp',
        otp,
      });
    }

    return {
      message:
        'If a patient account exists for this phone, an OTP has been sent.',
      expiresInSeconds: 600,
    };
  }

  // Max attempts per OTP. Bound chosen so a real user mistyping twice has
  // room to recover, but brute-force against a 6-digit OTP cannot succeed
  // (10^6 / 3 ≈ 333k OTPs needed, each costing an SMS). Attempts are
  // consumed atomically — see IPortalAuthRepository.tryConsumeOtpAttempt.
  private static readonly MAX_OTP_ATTEMPTS = 3;

  async verifyOtp(phoneNumber: string, otp: string) {
    const normalizedPhone = this.normalizePhone(phoneNumber);
    const now = this.clock.now();

    const otpRecord = await this.repository.findActiveOtp(normalizedPhone, now);

    if (!otpRecord) throw new UnauthorizedException('Invalid or expired OTP');

    // Atomic attempt consumption: the cap-check and the increment happen
    // in a single SQL UPDATE so concurrent requests cannot all observe
    // attempts < MAX and all run bcrypt.compare.
    const consumed = await this.repository.tryConsumeOtpAttempt(
      otpRecord.id,
      PatientPortalAuthCommandService.MAX_OTP_ATTEMPTS,
    );
    if (!consumed)
      throw new UnauthorizedException(
        'Too many attempts. Please request a new OTP.',
      );

    const isValid = await bcrypt.compare(otp, otpRecord.otpHash);
    if (!isValid) throw new UnauthorizedException('Invalid OTP');

    // Single-use claim: two concurrent verifies with the same valid OTP both
    // reach this point, so only the caller whose conditional UPDATE wins may
    // mint a session. The loser gets a controlled rejection.
    const claimed = await this.repository.tryMarkOtpUsed(otpRecord.id);
    if (!claimed)
      throw new UnauthorizedException(
        'This OTP has already been used. Please request a new OTP.',
      );

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
