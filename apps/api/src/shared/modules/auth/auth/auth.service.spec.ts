import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '@/prisma/prisma.service';
import { UserFactory } from '@/domains/users/core/factories/user.factory';
import { ClinicFactory } from '@/domains/clinics/core/factories/clinic.factory';
import { MonitoringService } from '@/shared/modules/monitoring/monitoring/monitoring.service';
import { ObservabilityService } from '@/shared/modules/services/observability.service';
import * as bcrypt from 'bcrypt';
import { Role } from '@workspace/db';

jest.mock('bcrypt');

describe.skip('AuthService', () => {
  let service: AuthService;
  let prismaService: PrismaService;
  let jwtService: JwtService;
  let userFactory: UserFactory;
  let clinicFactory: ClinicFactory;
  let passwordPolicy: { validate: jest.Mock };

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    password: 'hashedPassword',
    name: 'Test User',
    role: Role.DOCTOR,
    clinicId: 'clinic-123',
    createdAt: new Date(),
    updatedAt: new Date(),
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

  const mockUserWithoutPassword = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    role: Role.DOCTOR,
    clinicId: 'clinic-123',
    createdAt: mockUser.createdAt,
    updatedAt: mockUser.updatedAt,
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
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
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
            },
            runUnrestricted: jest
              .fn()
              .mockImplementation((callback) => callback()),
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
            create: jest.fn().mockImplementation((role, data) => ({
              ...data,
              role,
              password: data.passwordHash,
              clinic: data.clinicId
                ? { connect: { id: data.clinicId } }
                : undefined,
            })),
          },
        },
        {
          provide: ClinicFactory,
          useValue: {
            create: jest.fn().mockImplementation((data) => ({
              ...data,
              phone: '',
              address: '',
              tier: 'CORE',
              active: true,
            })),
          },
        },
        {
          provide: MonitoringService,
          useValue: {
            logError: jest.fn(),
            trackMetric: jest.fn(),
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
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
    userFactory = module.get<UserFactory>(UserFactory);
    clinicFactory = module.get<ClinicFactory>(ClinicFactory);
    passwordPolicy = module.get('IPasswordPolicy');

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return user without password when credentials are valid', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('test@example.com', 'password');

      expect(result).toEqual(mockUserWithoutPassword);
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should return null when password is incorrect', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser(
        'test@example.com',
        'wrongpassword',
      );

      expect(result).toBeNull();
    });

    it('should return null when user does not exist', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);

      const result = await service.validateUser(
        'nonexistent@example.com',
        'password',
      );

      expect(result).toBeNull();
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
      });
      expect(jwtService.sign).toHaveBeenCalledWith({
        email: mockUserWithoutPassword.email,
        sub: mockUserWithoutPassword.id,
        role: mockUserWithoutPassword.role,
        name: mockUserWithoutPassword.name,
        clinicId: mockUserWithoutPassword.clinicId,
      });
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

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedNewPassword');
      jest
        .spyOn(prismaService.user, 'create')
        .mockResolvedValue(mockUserWithoutPassword as never);

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
    });

    it('should default to DOCTOR role if not provided', async () => {
      const registerData = {
        email: 'admin@example.com',
        password: 'ValidPass123!',
        name: 'New Admin',
      };

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedNewPassword');
      jest.spyOn(prismaService.user, 'create').mockResolvedValue({
        ...mockUserWithoutPassword,
        role: Role.ADMIN,
      } as never);

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
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser);
      jest.spyOn(prismaService.user, 'update').mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);
      (bcrypt.hash as jest.Mock).mockResolvedValue('newHashedPassword');

      const result = await service.changePassword({
        userId: 'user-123',
        currentPassword: 'OldPass123!',
        newPassword: 'NewPass456!',
      });

      expect(passwordPolicy.validate).toHaveBeenCalledWith('NewPass456!');
      expect(result).toEqual({ message: 'Password changed successfully' });
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { password: 'newHashedPassword' },
      });
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
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.changePassword({
          userId: 'user-123',
          currentPassword: 'wrongPassword',
          newPassword: 'NewPass456!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when new password is same as current', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(
        service.changePassword({
          userId: 'user-123',
          currentPassword: 'SamePass123!',
          newPassword: 'SamePass123!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
