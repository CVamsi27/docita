import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ClinicTypeGuard, FacilityTypeGuard } from './clinic-type.guard';
import { UsersModule } from '../users/users.module';
import { ClinicsModule } from '../clinics/clinics.module';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DefaultPasswordPolicy } from './policies/password.policy';

// Validate JWT_SECRET is set in production
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET environment variable must be set in production');
}

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    UsersModule,
    ClinicsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret:
          configService.get<string>('JWT_SECRET') ||
          'dev-only-secret-do-not-use-in-prod',
        signOptions: {
          expiresIn: (configService.get<string>('JWT_EXPIRATION') ||
            '7d') as any,
        },
      }),
    }),
  ],
  providers: [
    AuthService,
    JwtStrategy,
    JwtAuthGuard,
    ClinicTypeGuard,
    FacilityTypeGuard,
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
  ],
})
export class AuthModule {}
