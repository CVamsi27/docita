import {
  Injectable,
  BadRequestException,
  ConflictException,
  Logger,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Role } from '@workspace/db';
import { IPasswordPolicy } from './policies/password.policy';
import { UserFactory } from '@/domains/users/core/factories/user.factory';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { CredentialValidationService } from './credential-validation.service';
import { AuthSessionService } from './auth-session.service';
import { AuthEmailVerificationService } from './auth-email-verification.service';
import type { RegisterData } from './auth.types';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';

@Injectable()
export class AuthRegistrationService {
  private readonly logger = new Logger(AuthRegistrationService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject('IPasswordPolicy') private readonly passwordPolicy: IPasswordPolicy,
    private readonly userFactory: UserFactory,
    private readonly appConfig: AppConfigService,
    private readonly credentialValidation: CredentialValidationService,
    private readonly session: AuthSessionService,
    private readonly emailVerification: AuthEmailVerificationService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async register(data: RegisterData) {
    // RLS-BYPASS: auth resolves users before clinic tenant context is established
    return this.prisma.runUnrestricted(async () => {
      this.passwordPolicy.validate(data.password);
      const isNonProduction = !this.appConfig.isProduction();
      // Auto-verify only in test runs OR when ALLOW_TEST_EMAIL_AUTOVERIFY is
      // explicitly enabled in a non-production env. The bare @test.com
      // shortcut used to fire in non-prod by default, which leaks if an env
      // misconfig flips isProduction() to false in prod.
      const allowTestEmailAutoVerify =
        process.env.ALLOW_TEST_EMAIL_AUTOVERIFY === 'true';
      const shouldAutoVerifyEmail =
        this.appConfig.isTest() ||
        (isNonProduction &&
          allowTestEmailAutoVerify &&
          data.email.endsWith('@test.com'));

      if (await this.credentialValidation.checkEmailExists(data.email)) {
        throw new ConflictException('User with this email already exists');
      }

      const hashedPassword = await bcrypt.hash(data.password, 10);

      const defaultRole = data.clinicName ? Role.ADMIN : Role.DOCTOR;
      const role = data.role || defaultRole;

      if (data.clinicName) {
        throw new BadRequestException(
          'Clinic registration now requires onboarding. Please complete registration at /onboarding to accept SLA, choose plan/add-ons, and configure billing.',
        );
      }

      const userData = this.userFactory.create(role, {
        email: data.email,
        name: data.name,
        passwordHash: hashedPassword,
        clinicId: data.clinicId,
      });

      const user = await this.prisma.user.create({
        data: {
          ...userData,
          onboardingStep: 'CHOOSE_PATH',
          onboardingStartedAt: this.clock.now(),
          emailVerified: shouldAutoVerifyEmail,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          clinicId: true,
          emailVerified: true,
          onboardingStep: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      const tokens = await this.session.login(user);
      let verificationEmailSent = shouldAutoVerifyEmail || !!user.emailVerified;

      if (!shouldAutoVerifyEmail) {
        verificationEmailSent = true;
        await this.emailVerification
          .sendVerificationEmail(user.id)
          .catch((err: unknown) => {
            verificationEmailSent = false;
            this.logger.warn(
              'Failed to send verification email after registration',
              {
                userId: user.id,
                error: err instanceof Error ? err.message : String(err),
              },
            );
          });
      }

      return {
        ...tokens,
        verificationEmailSent,
      };
    });
  }
}
