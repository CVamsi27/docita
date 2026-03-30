import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { MfaService } from './mfa.service';
import { ApiKeyService } from './api-key.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IpRateLimitGuard } from '@/shared/modules/auth/guards/ip-rate-limit.guard';
import { beforeEach, describe, it, expect, jest } from '@jest/globals';

describe('AuthController', () => {
  let controller: AuthController;
  let _authService: AuthService;

  const mockAuthService = {
    checkEmailExists: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    validateUser: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    login: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    loginWithMfaCheck: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    loginAfterMfa: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    register: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    changePassword: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    getSessions: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    revokeSession: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    revokeAllSessions: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  };

  const mockAppConfigService = {
    isProduction: jest.fn(() => false),
  };

  beforeEach(async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: MfaService,
          useValue: {
            generateSetupSecret:
              jest.fn<(...args: unknown[]) => Promise<unknown>>(),
            enableMfa: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
            disableMfa: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
            regenerateBackupCodes:
              jest.fn<(...args: unknown[]) => Promise<unknown>>(),
          },
        },
        {
          provide: ApiKeyService,
          useValue: {
            createApiKey: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
            listApiKeys: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
            revokeApiKey: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
          },
        },
        {
          provide: AppConfigService,
          useValue: mockAppConfigService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(IpRateLimitGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<AuthController>(AuthController);
    _authService = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('checkEmail', () => {
    it('should return exists boolean', async () => {
      mockAuthService.checkEmailExists.mockResolvedValue(true);
      const result = await controller.checkEmail({ email: 'test@example.com' });
      expect(result).toEqual({ exists: true });
      expect(mockAuthService.checkEmailExists).toHaveBeenCalledWith(
        'test@example.com',
      );
    });
  });

  describe('login', () => {
    it('should return token on successful login', async () => {
      const user = { id: '1', email: 'test@example.com', mfaEnabled: false };
      const token = { access_token: 'token', refresh_token: 'refresh', user };
      const response = {
        cookie: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      } as never;
      const request = { ip: '127.0.0.1', headers: {} } as never;
      mockAuthService.validateUser.mockResolvedValue(user);
      mockAuthService.loginWithMfaCheck.mockResolvedValue(token);

      const result = await controller.login(
        { email: 'test@example.com', password: 'password' },
        request,
        response,
      );
      expect(result).toEqual(token);
    });

    it('should throw UnauthorizedException on invalid credentials', async () => {
      const response = {
        cookie: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      } as never;
      const request = { ip: '127.0.0.1', headers: {} } as never;
      mockAuthService.validateUser.mockResolvedValue(null);
      await expect(
        controller.login(
          { email: 'test@example.com', password: 'wrong' },
          request,
          response,
        ),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('register', () => {
    it('should verify registration parameters and call logic', async () => {
      const dto = {
        email: 'new@example.com',
        password: 'password',
        firstName: 'John',
        lastName: 'Doe',
        clinicName: 'Clinic',
      };

      const expectedCall = {
        email: dto.email,
        password: dto.password,
        name: 'John Doe',
        clinicName: dto.clinicName,
      };

      const response = {
        cookie: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      } as never;
      mockAuthService.register.mockResolvedValue({
        id: '1',
        ...expectedCall,
        access_token: 'token',
        refresh_token: 'refresh',
      });

      await controller.register(dto, response);
      expect(mockAuthService.register).toHaveBeenCalledWith(expectedCall);
    });
  });
});
