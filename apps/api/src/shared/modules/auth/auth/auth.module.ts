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
import { AuthEffectivePermissionsController } from './auth-effective-permissions.controller';
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
import { PasswordExpiredGuard } from '@/shared/modules/auth/guards/password-expired.guard';
import { UsersModule } from '@/domains/users/users.module';
import { ClinicsModule } from '@/domains/clinics/clinics.module';
import { PassportModule } from '@nestjs/passport';
import { AppConfigModule } from '@/shared/modules/config/config.module';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { resolveJwtExpiresIn } from '@/shared/modules/config/app-config-jwt.helpers';
import { DefaultPasswordPolicy } from './policies/password.policy';
import { TurnstileModule } from '@/shared/modules/turnstile/turnstile.module';
import { EmailModule } from '@/shared/modules/messaging/email/email.module';
import { ConsentGuard } from '@/shared/modules/auth/guards/consent.guard';
import { EmailVerifiedGuard } from '@/shared/modules/auth/guards/email-verified.guard';
import { AuthGuardsModule } from './auth-guards.module';

@Module({
  imports: [
    PrismaModule,
    AuthGuardsModule,
    PassportModule,
    UsersModule,
    forwardRef(() => ClinicsModule),
    EmailModule,
    TurnstileModule,
    JwtModule.registerAsync({
      imports: [AppConfigModule],
      inject: [AppConfigService],
      useFactory: (configService: AppConfigService) => {
        const secret = configService.getJwtSecret();
        if (!secret) throw new Error('JWT_SECRET is not defined');
        return {
          secret: secret,
          signOptions: {
            expiresIn: resolveJwtExpiresIn(configService.getJwtExpiration()),
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
    PasswordExpiredGuard,
    ConsentGuard,
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
    AuthEffectivePermissionsController,
    AuthSessionController,
    AuthMfaController,
    AuthVerificationController,
    AuthApiKeysController,
  ],
  exports: [
    AuthService,
    AuthSessionService,
    MfaService,
    ApiKeyService,
    JwtAuthGuard,
    JwtStrategy,
    PassportModule,
    JwtModule,
    AuthGuardsModule,
    PasswordExpiredGuard,
    ConsentGuard,
    EmailVerifiedGuard,
  ],
})
export class AuthModule {}
