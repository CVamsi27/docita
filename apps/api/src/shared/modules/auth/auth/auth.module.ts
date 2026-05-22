import { Module, forwardRef } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CredentialValidationService } from './credential-validation.service';
import { AuthSessionService } from './auth-session.service';
import { AuthRegistrationService } from './auth-registration.service';
import { AuthPasswordService } from './auth-password.service';
import { AuthEmailVerificationService } from './auth-email-verification.service';
import { AuthMfaOrchestratorService } from './auth-mfa-orchestrator.service';
import { AuthRegistrationController } from './auth-registration.controller';
import { AuthLoginController } from './auth-login.controller';
import { AuthPasswordController } from './auth-password.controller';
import { AuthSessionController } from './auth-session.controller';
import { AuthMfaController } from './auth-mfa.controller';
import { AuthVerificationController } from './auth-verification.controller';
import { AuthApiKeysController } from './auth-api-keys.controller';
import { MfaService } from './mfa.service';
import { ApiKeyService } from './api-key.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ClinicTypeGuard, FacilityTypeGuard } from './clinic-type.guard';
import { ClinicAuthCacheService } from './clinic-auth-cache.service';
import { PasswordExpiredGuard } from '@/shared/modules/auth/guards/password-expired.guard';
import { ApiKeyGuard } from '@/shared/modules/auth/guards/api-key.guard';
import { UsersModule } from '@/domains/users/users.module';
import { ClinicsModule } from '@/domains/clinics/clinics.module';
import { PassportModule } from '@nestjs/passport';
import { AppConfigModule } from '@/shared/modules/config/config.module';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { DefaultPasswordPolicy } from './policies/password.policy';
import { EmailModule } from '@/shared/modules/messaging/email/email.module';
import { ConsentGuard } from '@/shared/modules/auth/guards/consent.guard';
import { PatientDoctorGuard } from '@/shared/modules/auth/guards/patient-doctor.guard';
import { EmailVerifiedGuard } from '@/shared/modules/auth/guards/email-verified.guard';

type JwtDuration = `${number}${'s' | 'm' | 'h' | 'd' | 'w' | 'y'}`;

const JWT_DURATION_PATTERN = /^\d+[smhdwy]$/;

function isJwtDuration(value: string): value is JwtDuration {
  return JWT_DURATION_PATTERN.test(value);
}

function parseJwtDuration(value: string): JwtDuration | null {
  return isJwtDuration(value) ? value : null;
}

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    UsersModule,
    forwardRef(() => ClinicsModule),
    EmailModule,
    JwtModule.registerAsync({
      imports: [AppConfigModule],
      inject: [AppConfigService],
      useFactory: (configService: AppConfigService) => {
        const secret = configService.getJwtSecret();
        const expiration = configService.getJwtExpiration();
        const parsedDuration = parseJwtDuration(expiration);
        const expiresIn = /^\d+$/.test(expiration)
          ? Number(expiration)
          : (parsedDuration ?? '7d');
        if (!secret) {
          throw new Error('JWT_SECRET is not defined');
        }
        return {
          secret: secret,
          signOptions: {
            expiresIn,
          },
        };
      },
    }),
  ],
  providers: [
    AuthService,
    CredentialValidationService,
    AuthSessionService,
    AuthRegistrationService,
    AuthPasswordService,
    AuthEmailVerificationService,
    AuthMfaOrchestratorService,
    MfaService,
    ApiKeyService,
    JwtStrategy,
    JwtAuthGuard,
    ClinicTypeGuard,
    FacilityTypeGuard,
    ClinicAuthCacheService,
    PasswordExpiredGuard,
    ApiKeyGuard,
    ConsentGuard,
    PatientDoctorGuard,
    EmailVerifiedGuard,
    {
      provide: 'IPasswordPolicy',
      useClass: DefaultPasswordPolicy,
    },
  ],
  controllers: [
    AuthRegistrationController,
    AuthLoginController,
    AuthPasswordController,
    AuthSessionController,
    AuthMfaController,
    AuthVerificationController,
    AuthApiKeysController,
  ],
  exports: [
    AuthService,
    MfaService,
    ApiKeyService,
    JwtAuthGuard,
    JwtStrategy,
    PassportModule,
    JwtModule,
    ClinicTypeGuard,
    FacilityTypeGuard,
    ClinicAuthCacheService,
    PasswordExpiredGuard,
    ApiKeyGuard,
    ConsentGuard,
    PatientDoctorGuard,
    EmailVerifiedGuard,
  ],
})
export class AuthModule {}
