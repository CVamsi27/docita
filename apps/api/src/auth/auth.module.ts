import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ClinicTypeGuard, FacilityTypeGuard } from './clinic-type.guard';
import type { JwtSignOptions } from '@nestjs/jwt';

// Validate JWT_SECRET is set in production
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET environment variable must be set in production');
}

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: jwtSecret || 'dev-only-secret-do-not-use-in-prod',
      signOptions: {
        expiresIn: process.env.JWT_EXPIRATION || '7d',
      } as JwtSignOptions,
    }),
  ],
  providers: [
    AuthService,
    JwtStrategy,
    JwtAuthGuard,
    ClinicTypeGuard,
    FacilityTypeGuard,
  ],
  controllers: [AuthController],
  exports: [AuthService, JwtAuthGuard, ClinicTypeGuard, FacilityTypeGuard],
})
export class AuthModule {}
