import { Module, forwardRef } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ClinicTypeGuard, FacilityTypeGuard } from './clinic-type.guard';
import { ClinicAuthCacheService } from './clinic-auth-cache.service';
import { UsersModule } from '@/domains/users/users.module';
import { ClinicsModule } from '@/domains/clinics/clinics.module';
import { PassportModule } from '@nestjs/passport';
import { AppConfigModule } from '@/shared/modules/config/config.module';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { DefaultPasswordPolicy } from './policies/password.policy';

type JwtDuration = `${number}${'s' | 'm' | 'h' | 'd' | 'w' | 'y'}`;

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    UsersModule,
    forwardRef(() => ClinicsModule),
    JwtModule.registerAsync({
      imports: [AppConfigModule],
      inject: [AppConfigService],
      useFactory: (configService: AppConfigService) => {
        const secret = configService.getJwtSecret();
        const expiration = configService.getJwtExpiration();
        const expiresIn = /^\d+$/.test(expiration)
          ? Number(expiration)
          : (expiration as JwtDuration);
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
    JwtStrategy,
    JwtAuthGuard,
    ClinicTypeGuard,
    FacilityTypeGuard,
    ClinicAuthCacheService,
    {
      provide: 'IPasswordPolicy',
      useClass: DefaultPasswordPolicy,
    },
  ],
  controllers: [AuthController],
  exports: [
    AuthService,
    JwtAuthGuard,
    JwtStrategy,
    PassportModule,
    JwtModule,
    ClinicTypeGuard,
    FacilityTypeGuard,
    ClinicAuthCacheService,
  ],
})
export class AuthModule {}
