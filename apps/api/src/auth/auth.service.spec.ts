import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: PrismaService;
  let jwtService: JwtService;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    password: 'hashedPassword',
    name: 'Test User',
    role: 'DOCTOR' as const,
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
    role: 'DOCTOR' as const,
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
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-jwt-token'),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);

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
    it('should return access token and user info', () => {
      const result = service.login(mockUserWithoutPassword);

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
        role: 'DOCTOR' as const,
      };

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedNewPassword');
      jest
        .spyOn(prismaService.user, 'create')
        .mockResolvedValue(mockUserWithoutPassword);

      const result = await service.register(registerData);

      expect(bcrypt.hash).toHaveBeenCalledWith('ValidPass123!', 10);
      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: {
          ...registerData,
          password: 'hashedNewPassword',
        },
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
      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('user');
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser);
      jest.spyOn(prismaService.user, 'update').mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock)
        .mockResolvedValueOnce(true) // current password match
        .mockResolvedValueOnce(false); // new password different
      (bcrypt.hash as jest.Mock).mockResolvedValue('newHashedPassword');

      const result = await service.changePassword({
        userId: 'user-123',
        currentPassword: 'OldPass123!',
        newPassword: 'NewPass456!',
      });

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
      (bcrypt.compare as jest.Mock).mockResolvedValue(true); // Both comparisons return true

      await expect(
        service.changePassword({
          userId: 'user-123',
          currentPassword: 'SamePass123!',
          newPassword: 'SamePass123!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException when password is too short', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock)
        .mockResolvedValueOnce(true) // current password match
        .mockResolvedValueOnce(false); // new password different

      await expect(
        service.changePassword({
          userId: 'user-123',
          currentPassword: 'OldPass123!',
          newPassword: 'Sh0rt!',
        }),
      ).rejects.toThrow('Password must be at least 8 characters long');
    });

    it('should throw BadRequestException when password is too long', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      const longPassword = 'A1!' + 'a'.repeat(130);
      await expect(
        service.changePassword({
          userId: 'user-123',
          currentPassword: 'OldPass123!',
          newPassword: longPassword,
        }),
      ).rejects.toThrow('Password must not exceed 128 characters');
    });

    it('should throw BadRequestException when password lacks uppercase', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      await expect(
        service.changePassword({
          userId: 'user-123',
          currentPassword: 'OldPass123!',
          newPassword: 'newpass123!',
        }),
      ).rejects.toThrow(
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      );
    });

    it('should throw BadRequestException when password lacks lowercase', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      await expect(
        service.changePassword({
          userId: 'user-123',
          currentPassword: 'OldPass123!',
          newPassword: 'NEWPASS123!',
        }),
      ).rejects.toThrow(
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      );
    });

    it('should throw BadRequestException when password lacks number', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      await expect(
        service.changePassword({
          userId: 'user-123',
          currentPassword: 'OldPass123!',
          newPassword: 'NewPassword!',
        }),
      ).rejects.toThrow(
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      );
    });

    it('should throw BadRequestException when password lacks special character', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      await expect(
        service.changePassword({
          userId: 'user-123',
          currentPassword: 'OldPass123!',
          newPassword: 'NewPassword123',
        }),
      ).rejects.toThrow(
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      );
    });

    it('should throw BadRequestException when password is too common', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      await expect(
        service.changePassword({
          userId: 'user-123',
          currentPassword: 'OldPass123!',
          newPassword: 'Password1!',
        }),
      ).rejects.toThrow(
        'Password is too common. Please choose a stronger password',
      );
    });
  });
});
