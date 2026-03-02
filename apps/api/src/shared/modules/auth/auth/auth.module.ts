import { Module, forwardRef } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ClinicTypeGuard, FacilityTypeGuard } from './clinic-type.guard';
import { ClinicAuthCacheService } from './clinic-auth-cache.service';
import { OptimizedTierGuard } from './optimized-tier.guard';
import { CombinedAuthGuard } from './combined-auth.guard';
import { UsersModule } from '@/domains/users/users.module';
import { ClinicsModule } from '@/domains/clinics/clinics.module';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DefaultPasswordPolicy } from './policies/password.policy';

type JwtDuration = `${number}${'s' | 'm' | 'h' | 'd' | 'w' | 'y'}`;

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    UsersModule,
    forwardRef(() => ClinicsModule),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');
        const expiration = configService.get<string>('JWT_EXPIRATION') || '7d';
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
    OptimizedTierGuard,
    CombinedAuthGuard,
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
    OptimizedTierGuard,
    CombinedAuthGuard,
  ],
})
export class AuthModule {}
