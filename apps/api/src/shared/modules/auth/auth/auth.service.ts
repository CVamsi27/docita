import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  Inject,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Role } from '@workspace/db';
import { IPasswordPolicy } from './policies/password.policy';
import { UserFactory } from '../users/factories/user.factory';
import { MonitoringService } from '../monitoring/monitoring.service';
import { ObservabilityService } from '../../common/services/observability.service';
import { nanoid } from 'nanoid';

interface UserWithoutPassword {
  id: string;
  email: string;
  name: string;
  role: Role;
  clinicId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface RegisterData {
  email: string;
  password: string;
  name: string;
  role?: Role;
  clinicId?: string;
  clinicName?: string;
}

interface ChangePasswordData {
  userId: string;
  currentPassword: string;
  newPassword: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    @Inject('IPasswordPolicy') private passwordPolicy: IPasswordPolicy,
    private userFactory: UserFactory,
    private monitoringService: MonitoringService,
    private observability: ObservabilityService,
  ) {}

  async checkEmailExists(email: string): Promise<boolean> {
    return this.prisma.runUnrestricted(async () => {
      const user = await this.prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });
      return !!user;
    });
  }

  async validateUser(
    email: string,
    pass: string,
  ): Promise<UserWithoutPassword | null> {
    return this.prisma.runUnrestricted(async () => {
      const user = await this.prisma.user.findUnique({ where: { email } });

      if (!user) {
        return null; // User not found
      }

      // Check if account is locked
      if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
        const minutesRemaining = Math.ceil(
          (user.accountLockedUntil.getTime() - Date.now()) / 60000,
        );
        throw new UnauthorizedException(
          `Account is locked due to too many failed login attempts. Try again in ${minutesRemaining} minute(s).`,
        );
      }

      // If lockout period has expired, reset the lockout
      if (user.accountLockedUntil && user.accountLockedUntil <= new Date()) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: 0,
            accountLockedUntil: null,
            lastFailedLoginAt: null,
          },
        });
      }

      // Verify password
      const passwordMatch = await bcrypt.compare(pass, user.password);

      if (passwordMatch) {
        // Successful login - reset failed attempts
        if (user.failedLoginAttempts > 0) {
          await this.prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: 0,
              lastFailedLoginAt: null,
            },
          });

          // Log successful login after previous failures (security check-in)
          this.observability.logStructured(
            'info',
            'Successful login after failed attempts',
            {
              userId: user.id,
              email: user.email,
              previousFailedAttempts: user.failedLoginAttempts,
            },
          );
        }

        const { password, ...result } = user;
        return result;
      }

      // Failed login - increment failed attempts
      const newFailedAttempts = user.failedLoginAttempts + 1;
      const MAX_FAILED_ATTEMPTS = 5;
      const LOCKOUT_DURATION_MINUTES = 15;

      const updateData: Record<string, unknown> = {
        failedLoginAttempts: newFailedAttempts,
        lastFailedLoginAt: new Date(),
      };

      // Lock account if threshold reached
      if (newFailedAttempts >= MAX_FAILED_ATTEMPTS) {
        updateData.accountLockedUntil = new Date(
          Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000,
        );
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });

      // Log failed auth attempt for security monitoring
      this.observability.logStructured(
        'warn',
        'Failed login attempt recorded',
        {
          userId: user.id,
          email: user.email,
          attempt: newFailedAttempts,
          maxAttempts: MAX_FAILED_ATTEMPTS,
          accountLocked: newFailedAttempts >= MAX_FAILED_ATTEMPTS,
          accountLockedUntilMinutes:
            newFailedAttempts >= MAX_FAILED_ATTEMPTS
              ? LOCKOUT_DURATION_MINUTES
              : null,
        },
      );

      // Alert on account lockout
      if (newFailedAttempts >= MAX_FAILED_ATTEMPTS) {
        this.observability.captureMessage(
          `Account locked: ${user.email} due to ${MAX_FAILED_ATTEMPTS} failed login attempts`,
          {
            userId: user.id,
            email: user.email,
            failedAttempts: newFailedAttempts,
            lockoutDuration: `${LOCKOUT_DURATION_MINUTES} minutes`,
          },
          'warning',
        );

        // Record error metric
        this.observability.recordMetric('auth_account_lockout_total', 1, {
          email: user.email,
          reason: 'max_failed_attempts',
        });
      }

      // Throw appropriate error message
      if (newFailedAttempts >= MAX_FAILED_ATTEMPTS) {
        throw new UnauthorizedException(
          `Account locked due to ${MAX_FAILED_ATTEMPTS} failed login attempts. Please try again in ${LOCKOUT_DURATION_MINUTES} minutes.`,
        );
      }

      return null; // Invalid password
    });
  }

  async login(user: UserWithoutPassword, tokenFamily?: string) {
    const payload: Record<string, unknown> = {
      email: user.email,
      sub: user.id,
      role: user.role,
      name: user.name,
      clinicId: user.clinicId,
    };

    // For PATIENT role users, find and include Patient ID in JWT
    if (user.role === Role.PATIENT) {
      const patient = await this.prisma.patient.findFirst({
        where: {
          userId: user.id,
        },
        select: { id: true },
      });

      if (patient) {
        payload.patientId = patient.id;
      }
    }

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = nanoid(64);
    // Use nanoid(16) for token family ID for detecting token reuse attacks
    const newTokenFamily = tokenFamily || nanoid(16);

    // Store raw refresh token — nanoid(64) provides 384 bits of entropy,
    // making it safe for direct storage with unique index for O(1) lookup.
    await (this.prisma as any).refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        tokenFamily: newTokenFamily, // Track token family for reuse attack detection
      },
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        clinicId: user.clinicId,
      },
    };
  }

  async refreshTokens(incomingRefreshToken: string) {
    // O(1) lookup by unique token index
    const storedToken = await this.prisma.runUnrestricted(async () => {
      return await (this.prisma as any).refreshToken.findUnique({
        where: { token: incomingRefreshToken },
        include: { user: true },
      });
    });

    if (
      !storedToken ||
      storedToken.revokedAt ||
      storedToken.expiresAt < new Date()
    ) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // **TOKEN REUSE ATTACK DETECTION**
    // If the token has been replaced (indicates a previous refresh), check if someone is reusing
    // an old token from the chain. Revoke all tokens in this family to prevent compromise.
    if (storedToken.replacedByToken) {
      // This token was already rotated - possible reuse attack!
      // Revoke all tokens in this family
      await (this.prisma as any).refreshToken.updateMany({
        where: {
          tokenFamily: storedToken.tokenFamily,
          userId: storedToken.userId,
        },
        data: {
          revokedAt: new Date(),
        },
      });

      throw new UnauthorizedException(
        'Token reuse detected. All sessions have been revoked. Please log in again.',
      );
    }

    // Rotate: issue new tokens and revoke old one with same family
    const { password, ...userWithoutPassword } = storedToken.user;
    const newTokens = await this.login(
      userWithoutPassword,
      storedToken.tokenFamily, // Preserve token family for rotation chain
    );

    await (this.prisma as any).refreshToken.update({
      where: { id: storedToken.id },
      data: {
        revokedAt: new Date(),
        replacedByToken: newTokens.refresh_token,
      },
    });

    return newTokens;
  }

  async logout(refreshToken: string) {
    try {
      await (this.prisma as any).refreshToken.update({
        where: { token: refreshToken },
        data: { revokedAt: new Date() },
      });
    } catch {
      // Token not found or already revoked — silently ignore
    }
  }

  async register(data: RegisterData) {
    return this.prisma.runUnrestricted(async () => {
      // Validate password strength
      this.passwordPolicy.validate(data.password);

      if (await this.checkEmailExists(data.email)) {
        throw new ConflictException('User with this email already exists');
      }

      const hashedPassword = await bcrypt.hash(data.password, 10);
      // If clinicName is provided, default role to ADMIN (owner), otherwise DOCTOR (staff)
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
        clinicId: data.clinicId, // May be undefined if creating new clinic
      });

      // Standard User Creation (e.g. Patient)
      const user = await this.prisma.user.create({
        data: userData,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          clinicId: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      return this.login(user);
    });
  }

  async changePassword(data: ChangePasswordData) {
    const user = await this.prisma.user.findUnique({
      where: { id: data.userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verify current password
    const passwordMatch = await bcrypt.compare(
      data.currentPassword,
      user.password,
    );
    if (!passwordMatch) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Prevent using the same password
    const samePassword = await bcrypt.compare(data.newPassword, user.password);
    if (samePassword) {
      throw new UnauthorizedException(
        'New password must be different from current password',
      );
    }

    // Validate new password strength
    this.passwordPolicy.validate(data.newPassword);

    // Hash new password
    const hashedPassword = await bcrypt.hash(data.newPassword, 10);

    // Update password
    await this.prisma.user.update({
      where: { id: data.userId },
      data: { password: hashedPassword },
    });

    return { message: 'Password changed successfully' };
  }
}
