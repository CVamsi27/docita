import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CredentialValidationService } from './credential-validation.service';
import { AuthSessionService } from './auth-session.service';
import { AuthRegistrationService } from './auth-registration.service';
import { AuthPasswordService } from './auth-password.service';
import { AuthEmailVerificationService } from './auth-email-verification.service';
import { AuthMfaOrchestratorService } from './auth-mfa-orchestrator.service';
import { MfaService } from './mfa.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { EmailService } from '@/shared/modules/messaging/email/email.service';
import { PrismaService } from '@/prisma/prisma.service';
import { UserFactory } from '@/domains/users/core/factories/user.factory';
import { ObservabilityService } from '@/shared/modules/services/observability.service';
import { AUTH_CONSTANTS } from '@/shared/modules/config/app-constants';
import * as bcrypt from 'bcrypt';
import { OnboardingStep, Prisma, Role } from '@workspace/db';
import { beforeEach, describe, it, expect, jest } from '@jest/globals';
import { clockPortTestProvider } from '@/test-utils';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let sessionService: AuthSessionService;
  type ObservabilityServiceMock = {
    logStructured: jest.Mock;
    captureMessage: jest.Mock;
    recordMetric: jest.Mock;
  };
  let prismaService: {
    user: {
      findUnique: jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
      findFirst: jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
      create: jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
      update: jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
    };
    clinic: {
      create: jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
      findUnique: jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
    };
    refreshToken: {
      create: jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
      findUnique: jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
      update: jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
      updateMany: jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
    };
    patient: {
      findFirst: jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
    };
    passwordHistory: {
      create: jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
      findMany: jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
      deleteMany: jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
    };
    $transaction: jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
    runUnrestricted: jest.MockedFunction<(callback: () => unknown) => unknown>;
  };
  let jwtService: JwtService;
  let userFactory: UserFactory;
  let observabilityService: ObservabilityServiceMock;
  let mfaService: {
    issueMfaChallenge: jest.MockedFunction<
      (...args: unknown[]) => Promise<unknown>
    >;
    verifyMfaChallenge: jest.MockedFunction<
      (...args: unknown[]) => Promise<unknown>
    >;
  };
  let emailService: {
    sendVerificationEmail: jest.MockedFunction<
      (...args: unknown[]) => Promise<unknown>
    >;
    sendPasswordResetEmail: jest.MockedFunction<
      (...args: unknown[]) => Promise<unknown>
    >;
  };
  let passwordPolicy: {
    validate: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
  };

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    password: 'hashedPassword',
    name: 'Test User',
    role: Role.DOCTOR,
    clinicId: 'clinic-123',
    createdAt: new Date(),
    updatedAt: new Date(),
    mfaEnabled: false,
    mfaSecret: null,
    mfaTempSecret: null,
    mfaBackupCodes: [],
    passwordChangedAt: null,
    passwordExpiresAt: null,
    passwordHistory: [],
    failedLoginAttempts: 0,
    lastFailedLoginAt: null,
    accountLockedUntil: null,
    emailVerified: false,
    onboardingStep: 'CHOOSE_PATH' as OnboardingStep,
    qualification: null,
    registrationNumber: null,
    signatureUrl: null,
    bio: null,
    consultationFee: null,
    hospitalRole: null,
    licenseExpiry: null,
    licenseNumber: null,
    phoneNumber: null,
    profilePhotoUrl: null,
    specialization: null,
    yearsOfExperience: null,
    appLoginDisabled: false,
  };

  const mockUserWithoutPassword = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    role: Role.DOCTOR,
    clinicId: 'clinic-123',
    emailVerified: false,
    onboardingStep: 'CHOOSE_PATH' as OnboardingStep,
    createdAt: mockUser.createdAt,
    updatedAt: mockUser.updatedAt,
    mfaEnabled: false,
    qualification: null,
    registrationNumber: null,
    signatureUrl: null,
    bio: null,
    consultationFee: null,
    hospitalRole: null,
    licenseExpiry: null,
    licenseNumber: null,
    phoneNumber: null,
    profilePhotoUrl: null,
    specialization: null,
    yearsOfExperience: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        CredentialValidationService,
        AuthSessionService,
        AuthRegistrationService,
        AuthPasswordService,
        AuthEmailVerificationService,
        AuthMfaOrchestratorService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
            clinic: {
              create: jest.fn(),
              findUnique: jest.fn(),
            },
            refreshToken: {
              create: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              updateMany: jest.fn(),
            },
            patient: {
              findFirst: jest.fn(),
            },
            passwordHistory: {
              create: jest.fn(),
              findMany: jest
                .fn<(...args: unknown[]) => Promise<unknown>>()
                .mockResolvedValue([]),
              deleteMany: jest.fn(),
            },
            $transaction: jest.fn().mockImplementation(async (ops: unknown) => {
              if (typeof ops === 'function') {
                return (ops as (tx: unknown) => Promise<unknown>)({
                  user: {
                    update: jest.fn(),
                  },
                  passwordHistory: {
                    create: jest.fn(),
                  },
                });
              }
              return Promise.all(ops as Promise<unknown>[]);
            }),
            runUnrestricted: jest
              .fn()
              .mockImplementation((callback: unknown) =>
                (callback as () => unknown)(),
              ),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-jwt-token'),
          },
        },
        {
          provide: 'IPasswordPolicy',
          useValue: {
            validate: jest.fn(),
          },
        },
        {
          provide: UserFactory,
          useValue: {
            create: jest.fn().mockImplementation((role, data: unknown) => {
              const payload = data as {
                passwordHash?: string;
                clinicId?: string;
              } & Record<string, unknown>;

              return {
                ...payload,
                role,
                password: payload.passwordHash,
                clinic: payload.clinicId
                  ? { connect: { id: payload.clinicId } }
                  : undefined,
              };
            }),
          },
        },
        {
          provide: AppConfigService,
          useValue: {
            isProduction: jest.fn().mockReturnValue(false),
            isTest: jest.fn().mockReturnValue(false),
            shouldAllowTestEmailAutoVerify: jest.fn().mockReturnValue(false),
          },
        },
        {
          provide: ObservabilityService,
          useValue: {
            logStructured: jest.fn(),
            captureMessage: jest.fn(),
            recordMetric: jest.fn(),
          },
        },
        {
          provide: MfaService,
          useValue: {
            issueMfaChallenge: jest.fn(),
            verifyMfaChallenge: jest.fn(),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendVerificationEmail: jest.fn().mockImplementation(async () => ({
              success: true,
              messageId: 'test',
            })),
            sendPasswordResetEmail: jest
              .fn()
              .mockImplementation(async () => ({ success: true })),
          },
        },
        clockPortTestProvider(),
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    sessionService = module.get<AuthSessionService>(AuthSessionService);
    prismaService = module.get<typeof prismaService>(PrismaService);
    prismaService.$transaction.mockImplementation(async (ops: unknown) => {
      if (typeof ops === 'function')
        return (ops as (tx: unknown) => Promise<unknown>)(prismaService);
      return Promise.all(ops as Promise<unknown>[]);
    });
    jwtService = module.get<JwtService>(JwtService);
    userFactory = module.get<UserFactory>(UserFactory);
    observabilityService = module.get<ObservabilityService>(
      ObservabilityService,
    ) as unknown as ObservabilityServiceMock;
    mfaService = module.get<typeof mfaService>(MfaService);
    emailService = module.get<typeof emailService>(EmailService);
    passwordPolicy = module.get('IPasswordPolicy');

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return user without password when credentials are valid', async () => {
      jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue(mockUser);
      jest.mocked(bcrypt.compare).mockImplementation(async () => true);

      const result = await service.validateUser('test@example.com', 'password');

      expect(result).toMatchObject(mockUserWithoutPassword);
      expect(result).not.toHaveProperty('password');
      expect(prismaService.user.findFirst).toHaveBeenCalledWith({
        where: { email: 'test@example.com', deletedAt: null },
      });
    });

    it('should reject login when appLoginDisabled is true', async () => {
      jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue({
        ...mockUser,
        appLoginDisabled: true,
      });

      await expect(
        service.validateUser('test@example.com', 'password'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject DOCTOR sign-in for FRONT_DESK mode clinics', async () => {
      jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue({
        ...mockUser,
        role: Role.DOCTOR,
      });
      jest.spyOn(prismaService.clinic, 'findUnique').mockResolvedValue({
        tier: 'ESSENTIAL',
        planMode: 'FRONT_DESK',
      } as never);
      jest.mocked(bcrypt.compare).mockImplementation(async () => true);

      await expect(
        service.validateUser('test@example.com', 'password'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject ADMIN_DOCTOR sign-in for FRONT_DESK mode clinics', async () => {
      jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue({
        ...mockUser,
        role: Role.ADMIN_DOCTOR,
      });
      jest.spyOn(prismaService.clinic, 'findUnique').mockResolvedValue({
        tier: 'ESSENTIAL',
        planMode: 'FRONT_DESK',
      } as never);
      jest.mocked(bcrypt.compare).mockImplementation(async () => true);

      await expect(
        service.validateUser('test@example.com', 'password'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow RECEPTIONIST sign-in for FRONT_DESK mode clinics', async () => {
      jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue({
        ...mockUser,
        role: Role.RECEPTIONIST,
      });
      jest.spyOn(prismaService.clinic, 'findUnique').mockResolvedValue({
        tier: 'ESSENTIAL',
        planMode: 'FRONT_DESK',
      } as never);
      jest.mocked(bcrypt.compare).mockImplementation(async () => true);

      const result = await service.validateUser('test@example.com', 'password');
      expect(result).not.toBeNull();
      expect(result?.role).toBe(Role.RECEPTIONIST);
    });

    it('should allow ADMIN sign-in for FRONT_DESK mode clinics', async () => {
      jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue({
        ...mockUser,
        role: Role.ADMIN,
      });
      jest.spyOn(prismaService.clinic, 'findUnique').mockResolvedValue({
        tier: 'ESSENTIAL',
        planMode: 'FRONT_DESK',
      } as never);
      jest.mocked(bcrypt.compare).mockImplementation(async () => true);

      const result = await service.validateUser('test@example.com', 'password');
      expect(result).not.toBeNull();
      expect(result?.role).toBe(Role.ADMIN);
    });

    it('should allow DOCTOR sign-in for non-FRONT_DESK clinics', async () => {
      jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue({
        ...mockUser,
        role: Role.DOCTOR,
      });
      jest
        .spyOn(prismaService.clinic, 'findUnique')
        .mockResolvedValue({ tier: 'PROFESSIONAL' } as never);
      jest.mocked(bcrypt.compare).mockImplementation(async () => true);

      const result = await service.validateUser('test@example.com', 'password');
      expect(result).not.toBeNull();
      expect(result?.role).toBe(Role.DOCTOR);
    });

    it('should return null when password is incorrect', async () => {
      jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue(mockUser);
      jest.mocked(bcrypt.compare).mockImplementation(async () => false);

      const result = await service.validateUser(
        'test@example.com',
        'wrongpassword',
      );

      expect(result).toBeNull();
      expect(observabilityService.logStructured).toHaveBeenCalledWith(
        'warn',
        'Failed login attempt recorded',
        expect.objectContaining({
          userId: mockUser.id,
          attempt: 1,
          maxAttempts: AUTH_CONSTANTS.MAX_FAILED_LOGIN_ATTEMPTS,
          accountLocked: false,
          accountLockedUntilMinutes: null,
        }),
        { captureInSentry: false },
      );
      expect(observabilityService.captureMessage).not.toHaveBeenCalled();
    });

    it('should return null when user does not exist', async () => {
      jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue(null);

      const result = await service.validateUser(
        'nonexistent@example.com',
        'password',
      );

      expect(result).toBeNull();
    });

    it('should still emit a Sentry warning when failed logins lock the account', async () => {
      jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue({
        ...mockUser,
        failedLoginAttempts: AUTH_CONSTANTS.MAX_FAILED_LOGIN_ATTEMPTS - 1,
      });
      jest.mocked(bcrypt.compare).mockImplementation(async () => false);

      await expect(
        service.validateUser('test@example.com', 'wrongpassword'),
      ).rejects.toThrow(UnauthorizedException);

      expect(observabilityService.captureMessage).toHaveBeenCalledWith(
        expect.stringContaining('Account locked for user'),
        expect.objectContaining({
          userId: mockUser.id,
          failedAttempts: AUTH_CONSTANTS.MAX_FAILED_LOGIN_ATTEMPTS,
          lockoutDuration: `${AUTH_CONSTANTS.LOCKOUT_DURATION_MINUTES} minutes`,
        }),
        'warning',
      );
      expect(observabilityService.recordMetric).toHaveBeenCalledWith(
        'auth_account_lockout_total',
        1,
        { reason: 'max_failed_attempts' },
      );
    });
  });

  describe('login', () => {
    it('should return access token and user info', async () => {
      const result = await service.login(mockUserWithoutPassword);

      expect(result).toHaveProperty('access_token', 'mock-jwt-token');
      expect(result).toHaveProperty('user');
      expect(result.user).toEqual({
        id: mockUserWithoutPassword.id,
        email: mockUserWithoutPassword.email,
        name: mockUserWithoutPassword.name,
        role: mockUserWithoutPassword.role,
        clinicId: mockUserWithoutPassword.clinicId,
        emailVerified: mockUserWithoutPassword.emailVerified,
        onboardingStep: OnboardingStep.COMPLETED,
      });
      expect(jwtService.sign).toHaveBeenCalledWith(
        {
          email: mockUserWithoutPassword.email,
          sub: mockUserWithoutPassword.id,
          role: mockUserWithoutPassword.role,
          name: mockUserWithoutPassword.name,
          clinicId: mockUserWithoutPassword.clinicId,
        },
        { audience: 'staff' },
      );
    });

    it('persists refresh tokens for 30 days', async () => {
      await service.login(mockUserWithoutPassword);

      expect(prismaService.refreshToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            expiresAt: new Date(
              new Date('2026-01-15T12:00:00.000Z').getTime() +
                AUTH_CONSTANTS.REFRESH_TOKEN_MAX_AGE_MS,
            ),
          }),
        }),
      );
    });

    it('adds patientId to token payload for patient users', async () => {
      const patientUser = {
        ...mockUserWithoutPassword,
        role: Role.PATIENT,
      };
      jest
        .spyOn(prismaService.patient, 'findFirst')
        .mockResolvedValue({ id: 'patient-1' });

      await service.login(patientUser);

      expect(prismaService.runUnrestricted).toHaveBeenCalled();
      expect(prismaService.patient.findFirst).toHaveBeenCalledWith({
        where: { userId: patientUser.id },
        select: { id: true },
      });
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: patientUser.id,
          patientId: 'patient-1',
        }),
        { audience: 'patient-portal' },
      );
    });
  });

  describe('loginAfterMfa', () => {
    it('resolves user through unrestricted lookup and issues tokens', async () => {
      mfaService.verifyMfaChallenge.mockResolvedValue('user-123');
      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue(mockUserWithoutPassword);

      const tokens = await service.loginAfterMfa('challenge-token', '123456', {
        deviceName: 'Chrome',
        ipAddress: '127.0.0.1',
      });

      expect(mfaService.verifyMfaChallenge).toHaveBeenCalledWith(
        'challenge-token',
        '123456',
      );
      expect(prismaService.runUnrestricted).toHaveBeenCalled();
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
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
      expect(tokens).toHaveProperty('access_token');
      expect(tokens).toHaveProperty('refresh_token');
    });

    it('throws when MFA challenge resolves to unknown user', async () => {
      mfaService.verifyMfaChallenge.mockResolvedValue('missing-user');
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);

      await expect(
        service.loginAfterMfa('challenge-token', '123456'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('register', () => {
    it('should create user with hashed password and return login response', async () => {
      const registerData = {
        email: 'new@example.com',
        password: 'ValidPass123!',
        name: 'New User',
        role: Role.DOCTOR,
      };

      jest
        .mocked(bcrypt.hash)
        .mockImplementation(async () => 'hashedNewPassword');
      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockImplementation(async (...callArgs: unknown[]) => {
          const args = callArgs[0] as {
            where?: { email?: string; id?: string };
          };
          if (args?.where?.email) return null;
          if (args?.where?.id) {
            return {
              id: mockUserWithoutPassword.id,
              email: mockUserWithoutPassword.email,
              name: mockUserWithoutPassword.name,
              emailVerified: false,
            };
          }
          return null;
        });
      jest
        .spyOn(prismaService.user, 'create')
        .mockResolvedValue(mockUserWithoutPassword);
      jest.spyOn(prismaService.refreshToken, 'create').mockResolvedValue({});

      const result = await service.register(registerData);

      expect(passwordPolicy.validate).toHaveBeenCalledWith('ValidPass123!');
      expect(bcrypt.hash).toHaveBeenCalledWith('ValidPass123!', 10);
      expect(userFactory.create).toHaveBeenCalledWith(
        Role.DOCTOR,
        expect.objectContaining({
          email: registerData.email,
          name: registerData.name,
          passwordHash: 'hashedNewPassword',
        }),
      );
      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: registerData.email,
          role: Role.DOCTOR,
          password: 'hashedNewPassword',
        }),
        select: expect.any(Object),
      });
      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('verificationEmailSent', true);
    });

    it('should default to DOCTOR role if not provided', async () => {
      const registerData = {
        email: 'admin@example.com',
        password: 'ValidPass123!',
        name: 'New Admin',
      };

      jest
        .mocked(bcrypt.hash)
        .mockImplementation(async () => 'hashedNewPassword');
      jest.spyOn(prismaService.user, 'create').mockResolvedValue({
        ...mockUserWithoutPassword,
        role: Role.ADMIN,
      });

      await service.register(registerData);

      expect(userFactory.create).toHaveBeenCalledWith(
        Role.DOCTOR,
        expect.anything(),
      );
    });

    it('should reject registration when clinicName is provided and require onboarding', async () => {
      const registerData = {
        email: 'admin@clinic.com',
        password: 'ValidPass123!',
        name: 'Clinic Admin',
        clinicName: 'New Clinic',
      };

      await expect(service.register(registerData)).rejects.toThrow(
        'Clinic registration now requires onboarding. Please complete registration at /onboarding to accept SLA, choose plan/add-ons, and configure billing.',
      );

      expect(prismaService.clinic.create).not.toHaveBeenCalled();
    });

    it('returns verificationEmailSent true when email sends successfully in non-test environments', async () => {
      const originalNodeEnv = process.env.NODE_ENV;

      try {
        process.env.NODE_ENV = 'development';

        const registerData = {
          email: 'new@example.com',
          password: 'ValidPass123!',
          name: 'New User',
          role: Role.DOCTOR,
        };

        jest
          .mocked(bcrypt.hash)
          .mockImplementation(async () => 'hashedNewPassword');
        jest
          .spyOn(prismaService.user, 'findUnique')
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({
            id: mockUserWithoutPassword.id,
            email: mockUserWithoutPassword.email,
            name: mockUserWithoutPassword.name,
            emailVerified: false,
          });
        jest
          .spyOn(prismaService.user, 'create')
          .mockResolvedValue(mockUserWithoutPassword);
        emailService.sendVerificationEmail.mockResolvedValueOnce({
          success: true,
          messageId: 'msg-1',
        });

        const result = await service.register(registerData);

        expect(result.verificationEmailSent).toBe(true);
        expect(emailService.sendVerificationEmail).toHaveBeenCalled();
      } finally {
        process.env.NODE_ENV = originalNodeEnv;
      }
    });

    it('returns a recoverable verification-email failure in non-test environments', async () => {
      const originalNodeEnv = process.env.NODE_ENV;

      try {
        process.env.NODE_ENV = 'development';

        const registerData = {
          email: 'new@example.com',
          password: 'ValidPass123!',
          name: 'New User',
          role: Role.DOCTOR,
        };

        jest
          .mocked(bcrypt.hash)
          .mockImplementation(async () => 'hashedNewPassword');
        jest
          .spyOn(prismaService.user, 'findUnique')
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({
            id: mockUserWithoutPassword.id,
            email: mockUserWithoutPassword.email,
            name: mockUserWithoutPassword.name,
            emailVerified: false,
          });
        jest
          .spyOn(prismaService.user, 'create')
          .mockResolvedValue(mockUserWithoutPassword);
        emailService.sendVerificationEmail.mockResolvedValueOnce({
          success: false,
          error: 'provider unavailable',
        });

        const result = await service.register(registerData);

        expect(result.verificationEmailSent).toBe(false);
        expect(emailService.sendVerificationEmail).toHaveBeenCalled();
      } finally {
        process.env.NODE_ENV = originalNodeEnv;
      }
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser);
      jest
        .mocked(bcrypt.compare)
        .mockImplementationOnce(async () => true)
        .mockImplementation(async () => false);
      jest
        .mocked(bcrypt.hash)
        .mockImplementation(async () => 'newHashedPassword');

      const result = await service.changePassword({
        userId: 'user-123',
        currentPassword: 'OldPass123!',
        newPassword: 'NewPass456!',
      });

      expect(passwordPolicy.validate).toHaveBeenCalledWith('NewPass456!');
      expect(result).toEqual({ message: 'Password changed successfully' });
    });

    it('should throw UnauthorizedException when user not found', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);

      await expect(
        service.changePassword({
          userId: 'non-existent',
          currentPassword: 'OldPass123!',
          newPassword: 'NewPass456!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when current password is incorrect', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser);
      jest.mocked(bcrypt.compare).mockImplementation(async () => false);

      await expect(
        service.changePassword({
          userId: 'user-123',
          currentPassword: 'wrongPassword',
          newPassword: 'NewPass456!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException when new password is same as current', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser);
      jest
        .mocked(bcrypt.compare)
        .mockImplementationOnce(async () => true)
        .mockImplementation(async () => true);

      await expect(
        service.changePassword({
          userId: 'user-123',
          currentPassword: 'OldPass123!',
          newPassword: 'SamePass123!',
        }),
      ).rejects.toThrow();
    });
  });

  describe('checkEmailExists', () => {
    it('returns true when user exists', async () => {
      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue({ id: 'u1' });

      await expect(
        service.checkEmailExists('exists@example.com'),
      ).resolves.toBe(true);
    });

    it('disables lookup after database auth failure and fails closed', async () => {
      const runUnrestrictedSpy = jest
        .spyOn(prismaService, 'runUnrestricted')
        .mockImplementationOnce(async () => {
          throw { code: 'P1000' };
        });

      await expect(service.checkEmailExists('first@example.com')).resolves.toBe(
        false,
      );
      await expect(
        service.checkEmailExists('second@example.com'),
      ).resolves.toBe(false);

      expect(runUnrestrictedSpy).toHaveBeenCalledTimes(1);
    });

    it('rethrows non-database-auth errors', async () => {
      jest
        .spyOn(prismaService, 'runUnrestricted')
        .mockImplementation(async () => {
          throw new Error('network timeout');
        });

      await expect(
        service.checkEmailExists('error@example.com'),
      ).rejects.toThrow('network timeout');
    });

    it('disables lookup and fails closed on database connectivity errors', async () => {
      const runUnrestrictedSpy = jest
        .spyOn(prismaService, 'runUnrestricted')
        .mockImplementation(async () => {
          throw new Error(
            'Error opening a TLS connection: self-signed certificate in certificate chain',
          );
        });

      await expect(
        service.checkEmailExists('tls-error@example.com'),
      ).resolves.toBe(false);
      await expect(
        service.checkEmailExists('tls-error-2@example.com'),
      ).resolves.toBe(false);

      expect(runUnrestrictedSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('refreshTokens', () => {
    it('throws UnauthorizedException when refresh token is missing', async () => {
      jest
        .spyOn(prismaService.refreshToken, 'findUnique')
        .mockResolvedValue(null);

      await expect(service.refreshTokens('missing-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('revokes token family and blocks token reuse', async () => {
      jest.spyOn(prismaService.refreshToken, 'findUnique').mockResolvedValue({
        id: 'rt-1',
        token: 'incoming',
        userId: 'user-123',
        tokenFamily: 'family-1',
        deviceName: 'Chrome',
        ipAddress: '127.0.0.1',
        userAgent: 'UA',
        revokedAt: null,
        expiresAt: new Date('2026-01-15T12:01:00.000Z'),
        replacedByToken: 'rotated-token',
        user: mockUser,
      });
      jest
        .spyOn(prismaService.refreshToken, 'updateMany')
        .mockResolvedValue({ count: 3 });

      await expect(service.refreshTokens('incoming')).rejects.toThrow(
        'Token reuse detected',
      );

      expect(prismaService.refreshToken.updateMany).toHaveBeenCalledWith({
        where: {
          tokenFamily: 'family-1',
          userId: 'user-123',
        },
        data: {
          revokedAt: expect.any(Date),
        },
      });
    });

    it('rotates refresh token on successful refresh', async () => {
      jest.spyOn(prismaService.refreshToken, 'findUnique').mockResolvedValue({
        id: 'rt-1',
        token: 'incoming',
        userId: 'user-123',
        tokenFamily: 'family-1',
        deviceName: 'Chrome',
        ipAddress: '127.0.0.1',
        userAgent: 'UA',
        revokedAt: null,
        expiresAt: new Date('2026-01-15T12:01:00.000Z'),
        replacedByToken: null,
        user: mockUser,
      });
      jest.spyOn(prismaService.refreshToken, 'create').mockResolvedValue({});
      jest
        .spyOn(prismaService.refreshToken, 'updateMany')
        .mockResolvedValue({ count: 1 });

      const tokens = await service.refreshTokens('incoming');

      expect(prismaService.refreshToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-123',
          tokenFamily: 'family-1',
          deviceName: 'Chrome',
          ipAddress: '127.0.0.1',
          userAgent: 'UA',
          tokenHash: expect.any(String),
        }),
      });
      expect(prismaService.refreshToken.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'rt-1',
          revokedAt: null,
          replacedByToken: null,
        },
        data: {
          revokedAt: expect.any(Date),
          replacedByToken: expect.any(String),
        },
      });
      expect(tokens.access_token).toBe('mock-jwt-token');
      expect(tokens.refresh_token).toEqual(expect.any(String));
      expect(tokens.user).toEqual(
        expect.objectContaining({
          id: mockUserWithoutPassword.id,
          email: mockUserWithoutPassword.email,
          role: mockUserWithoutPassword.role,
          clinicId: mockUserWithoutPassword.clinicId,
        }),
      );
    });

    it('looks up incoming refresh token by hash before falling back to plaintext', async () => {
      const findUniqueSpy = jest
        .spyOn(prismaService.refreshToken, 'findUnique')
        .mockResolvedValueOnce(null) // first call (by hash) — miss for legacy row
        .mockResolvedValueOnce({
          id: 'rt-legacy',
          token: 'legacy-raw',
          userId: 'user-123',
          tokenFamily: 'family-1',
          deviceName: null,
          ipAddress: null,
          userAgent: null,
          revokedAt: null,
          expiresAt: new Date('2026-01-15T12:01:00.000Z'),
          replacedByToken: null,
          user: mockUser,
        });
      jest.spyOn(prismaService.refreshToken, 'create').mockResolvedValue({});
      jest
        .spyOn(prismaService.refreshToken, 'updateMany')
        .mockResolvedValue({ count: 1 });

      await service.refreshTokens('legacy-raw');

      expect(findUniqueSpy).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          where: expect.objectContaining({ tokenHash: expect.any(String) }),
        }),
      );
      expect(findUniqueSpy).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ where: { token: 'legacy-raw' } }),
      );
    });

    it('retries refresh when the first transaction cannot acquire a pool connection', async () => {
      const acquireError = new Prisma.PrismaClientKnownRequestError(
        'Transaction API error: Unable to start a transaction in the given time.',
        { code: 'P2028', clientVersion: 'test' },
      );
      jest.spyOn(prismaService.refreshToken, 'findUnique').mockResolvedValue({
        id: 'rt-1',
        token: 'incoming',
        userId: 'user-123',
        tokenFamily: 'family-1',
        deviceName: null,
        ipAddress: null,
        userAgent: null,
        revokedAt: null,
        expiresAt: new Date('2026-01-15T12:01:00.000Z'),
        replacedByToken: null,
        user: mockUser,
      });
      jest.spyOn(prismaService.refreshToken, 'create').mockResolvedValue({});
      jest
        .spyOn(prismaService.refreshToken, 'updateMany')
        .mockResolvedValue({ count: 1 });

      const transactionSpy = jest.spyOn(prismaService, '$transaction');
      transactionSpy
        .mockRejectedValueOnce(acquireError)
        .mockImplementation(async (ops: unknown, options?: unknown) => {
          if (typeof ops === 'function')
            return (ops as (tx: unknown) => Promise<unknown>)(prismaService);
          return Promise.all(ops as Promise<unknown>[]);
        });

      const tokens = await service.refreshTokens('incoming');

      expect(transactionSpy).toHaveBeenCalledTimes(2);
      expect(transactionSpy).toHaveBeenLastCalledWith(
        expect.any(Function),
        expect.objectContaining({ maxWait: expect.any(Number) }),
      );
      expect(tokens.access_token).toBe('mock-jwt-token');
    });
  });

  describe('requestPasswordReset', () => {
    it('returns generic success response for unknown user', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);

      const result = await service.requestPasswordReset('missing@example.com');

      expect(result).toEqual({
        message:
          'If an account with that email exists, a reset link has been sent.',
      });
      expect(prismaService.user.update).not.toHaveBeenCalled();
    });

    it('stores reset token and sends email for known user', async () => {
      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue({ id: 'user-123' });
      jest.spyOn(prismaService.user, 'update').mockResolvedValue({});

      const result = await service.requestPasswordReset('test@example.com');

      expect(result).toEqual({
        message:
          'If an account with that email exists, a reset link has been sent.',
      });
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          passwordResetToken: expect.any(String),
          passwordResetExpiresAt: expect.any(Date),
        },
      });
      expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        'test@example.com',
        expect.any(String),
      );
    });
  });
});
