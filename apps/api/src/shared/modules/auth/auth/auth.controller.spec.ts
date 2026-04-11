import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Role } from '@workspace/db';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { AUTH_CONSTANTS } from '@/shared/modules/config/app-constants';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { IpRateLimitGuard } from '@/shared/modules/auth/guards/ip-rate-limit.guard';
import { asType } from '@/test-utils/as-type';
import { ApiKeyService } from './api-key.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { MfaService } from './mfa.service';

describe('AuthController', () => {
  let controller: AuthController;
  let loggerErrorSpy: jest.Spied<typeof Logger.prototype.error>;
  let loggerWarnSpy: jest.Spied<typeof Logger.prototype.warn>;

  const mockAuthService = {
    checkEmailExists: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    validateUser: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    login: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    loginWithMfaCheck: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    loginAfterMfa: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    register: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    changePassword: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    requestPasswordReset: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    resetPassword: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    refreshTokens: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    logout: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    getSessions: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    revokeSession: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    revokeAllSessions: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    verifyEmail: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    sendVerificationEmail: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  };

  const mockMfaService = {
    generateSetupSecret: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    enableMfa: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    disableMfa: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    regenerateBackupCodes: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  };

  const mockApiKeyService = {
    createApiKey: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    listApiKeys: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    revokeApiKey: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  };

  const mockAppConfigService = {
    isProduction: jest.fn(() => false),
  };

  type LoginRequest = Parameters<AuthController['login']>[1];
  type LoginResponse = Parameters<AuthController['login']>[2];
  type RegisterResponse = Parameters<AuthController['register']>[1];
  type RefreshRequest = Parameters<AuthController['refresh']>[1];
  type RefreshResponse = Parameters<AuthController['refresh']>[2];
  type LogoutRequest = Parameters<AuthController['logoutUser']>[1];
  type LogoutResponse = Parameters<AuthController['logoutUser']>[2];
  type VerifyMfaRequest = Parameters<AuthController['verifyMfa']>[1];
  type VerifyMfaResponse = Parameters<AuthController['verifyMfa']>[2];
  type AuthenticatedRequest = Parameters<AuthController['validate']>[0];
  type RevokeAllSessionsRequest = Parameters<
    AuthController['revokeAllSessions']
  >[0] & {
    cookies?: Record<string, string>;
  };

  const defaultAuthenticatedUser: AuthenticatedRequest['user'] = {
    id: 'user-1',
    sub: 'user-1',
    name: 'Test User',
    clinicId: 'clinic-1',
    emailVerified: false,
    onboardingStep: 'CHOOSE_PATH',
    role: Role.DOCTOR,
    email: 'test@example.com',
  };

  function createAuthenticatedRequest(
    overrides: Partial<AuthenticatedRequest> = {},
  ): AuthenticatedRequest {
    return asType<AuthenticatedRequest>({
      headers: {},
      body: {},
      query: {},
      params: {},
      user: {
        ...defaultAuthenticatedUser,
        ...(overrides.user ?? {}),
      },
      ...overrides,
    });
  }

  function createLoginResponse(): LoginResponse {
    const response = {} as LoginResponse;
    response.cookie = jest.fn(
      (..._args: Parameters<LoginResponse['cookie']>) => response,
    ) as LoginResponse['cookie'];
    return response;
  }

  function createRegisterResponse(): RegisterResponse {
    const response = {} as RegisterResponse;
    response.cookie = jest.fn(
      (..._args: Parameters<RegisterResponse['cookie']>) => response,
    ) as RegisterResponse['cookie'];
    return response;
  }

  function createRefreshResponse(): RefreshResponse {
    const response = {} as RefreshResponse;
    response.cookie = jest.fn(
      (..._args: Parameters<RefreshResponse['cookie']>) => response,
    ) as RefreshResponse['cookie'];
    return response;
  }

  function createLogoutResponse(): LogoutResponse {
    const response = {} as LogoutResponse;
    response.clearCookie = jest.fn(
      (..._args: Parameters<LogoutResponse['clearCookie']>) => response,
    ) as LogoutResponse['clearCookie'];
    return response;
  }

  function createVerifyMfaResponse(): VerifyMfaResponse {
    const response = {} as VerifyMfaResponse;
    response.cookie = jest.fn(
      (..._args: Parameters<VerifyMfaResponse['cookie']>) => response,
    ) as VerifyMfaResponse['cookie'];
    return response;
  }

  beforeEach(async () => {
    jest.clearAllMocks();
    loggerErrorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    loggerWarnSpy = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: MfaService, useValue: mockMfaService },
        { provide: ApiKeyService, useValue: mockApiKeyService },
        { provide: AppConfigService, useValue: mockAppConfigService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(IpRateLimitGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('checkEmail', () => {
    it('returns exists flag', async () => {
      mockAuthService.checkEmailExists.mockResolvedValue(true);

      await expect(
        controller.checkEmail({ email: 'test@example.com' }),
      ).resolves.toEqual({ exists: true });
      expect(mockAuthService.checkEmailExists).toHaveBeenCalledWith(
        'test@example.com',
      );
    });
  });

  describe('login', () => {
    it('sets auth cookies and returns tokens for successful login', async () => {
      const user = {
        id: 'user-1',
        email: 'test@example.com',
        role: Role.DOCTOR,
        clinicId: 'clinic-1',
      };
      const tokens = {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        user,
      };
      const response = createLoginResponse();
      const request = asType<LoginRequest>({ ip: '127.0.0.1', headers: {} });
      mockAuthService.validateUser.mockResolvedValue(user);
      mockAuthService.loginWithMfaCheck.mockResolvedValue(tokens);

      await expect(
        controller.login(
          { email: 'test@example.com', password: 'password' },
          request,
          response,
        ),
      ).resolves.toEqual(tokens);

      expect(response.cookie).toHaveBeenCalledWith(
        'access_token',
        'access-token',
        expect.objectContaining({
          httpOnly: true,
          secure: false,
          sameSite: 'strict',
          path: '/',
          maxAge: AUTH_CONSTANTS.ACCESS_TOKEN_MAX_AGE_MS,
        }),
      );
      expect(response.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'refresh-token',
        expect.objectContaining({
          httpOnly: true,
          secure: false,
          sameSite: 'strict',
          path: '/api/v1/auth',
          maxAge: AUTH_CONSTANTS.REFRESH_TOKEN_MAX_AGE_MS,
        }),
      );
    });

    it('returns MFA challenge payload without setting cookies', async () => {
      const user = {
        id: 'user-1',
        email: 'test@example.com',
        role: Role.DOCTOR,
        clinicId: 'clinic-1',
      };
      const mfaResult = {
        mfa_required: true,
        mfa_challenge_token: 'challenge',
      };
      const response = createLoginResponse();
      const request = asType<LoginRequest>({ ip: '127.0.0.1', headers: {} });
      mockAuthService.validateUser.mockResolvedValue(user);
      mockAuthService.loginWithMfaCheck.mockResolvedValue(mfaResult);

      await expect(
        controller.login(
          { email: 'test@example.com', password: 'password' },
          request,
          response,
        ),
      ).resolves.toEqual(mfaResult);
      expect(response.cookie).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when credentials are invalid', async () => {
      const response = createLoginResponse();
      const request = asType<LoginRequest>({ ip: '127.0.0.1', headers: {} });
      mockAuthService.validateUser.mockResolvedValue(null);

      await expect(
        controller.login(
          { email: 'test@example.com', password: 'wrong' },
          request,
          response,
        ),
      ).rejects.toThrow(UnauthorizedException);
      expect(loggerErrorSpy).toHaveBeenCalled();
    });

    it('logs and rethrows service errors', async () => {
      const response = createLoginResponse();
      const request = asType<LoginRequest>({ ip: '127.0.0.1', headers: {} });
      mockAuthService.validateUser.mockRejectedValue(new Error('db down'));

      await expect(
        controller.login(
          { email: 'test@example.com', password: 'password' },
          request,
          response,
        ),
      ).rejects.toThrow('db down');
      expect(loggerErrorSpy).toHaveBeenCalled();
    });
  });

  describe('register', () => {
    it('maps DTO and sets auth cookies on successful registration', async () => {
      const response = createRegisterResponse();
      const dto = {
        email: 'new@example.com',
        password: 'password',
        firstName: 'John',
        lastName: 'Doe',
        role: Role.ADMIN,
        clinicName: undefined,
      };
      const tokens = {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
      };
      mockAuthService.register.mockResolvedValue(tokens);

      await expect(controller.register(dto, response)).resolves.toEqual(tokens);
      expect(mockAuthService.register).toHaveBeenCalledWith({
        email: dto.email,
        password: dto.password,
        name: 'John Doe',
        role: dto.role,
        clinicName: dto.clinicName,
      });
      expect(response.cookie).toHaveBeenCalledTimes(2);
    });

    it('logs and rethrows registration errors', async () => {
      const response = createRegisterResponse();
      mockAuthService.register.mockRejectedValue(new Error('register failed'));

      await expect(
        controller.register(
          {
            email: 'new@example.com',
            password: 'password',
            firstName: 'John',
            lastName: 'Doe',
          },
          response,
        ),
      ).rejects.toThrow('register failed');
      expect(loggerErrorSpy).toHaveBeenCalled();
    });
  });

  describe('password operations', () => {
    it('forgets password through service', async () => {
      mockAuthService.requestPasswordReset.mockResolvedValue({ message: 'ok' });

      await expect(
        controller.forgotPassword({ email: 'test@example.com' }),
      ).resolves.toEqual({ message: 'ok' });
      expect(mockAuthService.requestPasswordReset).toHaveBeenCalledWith(
        'test@example.com',
      );
    });

    it('resets password through service', async () => {
      mockAuthService.resetPassword.mockResolvedValue({ message: 'reset' });

      await expect(
        controller.resetPassword({
          token: 'token',
          newPassword: 'NewPass123!',
        }),
      ).resolves.toEqual({ message: 'reset' });
      expect(mockAuthService.resetPassword).toHaveBeenCalledWith(
        'token',
        'NewPass123!',
      );
    });

    it('changes password for authenticated user', async () => {
      mockAuthService.changePassword.mockResolvedValue({ message: 'changed' });
      const request = createAuthenticatedRequest();

      await expect(
        controller.changePassword(request, {
          currentPassword: 'old',
          newPassword: 'new',
        }),
      ).resolves.toEqual({ message: 'changed' });
      expect(mockAuthService.changePassword).toHaveBeenCalledWith({
        userId: 'user-1',
        currentPassword: 'old',
        newPassword: 'new',
      });
    });
  });

  describe('session and token endpoints', () => {
    it('returns validated session shape', () => {
      const result = controller.validate(createAuthenticatedRequest());

      expect(result).toEqual({
        valid: true,
        user: {
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test User',
          role: Role.DOCTOR,
          clinicId: 'clinic-1',
          emailVerified: false,
          onboardingStep: 'CHOOSE_PATH',
        },
      });
    });

    it('refreshes using dto token and sets cookies', async () => {
      const response = createRefreshResponse();
      const request = asType<RefreshRequest>({ cookies: {} });
      const tokens = {
        access_token: 'new-access',
        refresh_token: 'new-refresh',
      };
      mockAuthService.refreshTokens.mockResolvedValue(tokens);

      await expect(
        controller.refresh({ refresh_token: 'dto-refresh' }, request, response),
      ).resolves.toEqual(tokens);
      expect(mockAuthService.refreshTokens).toHaveBeenCalledWith('dto-refresh');
      expect(response.cookie).toHaveBeenCalledTimes(2);
    });

    it('refreshes using cookie token fallback', async () => {
      const response = createRefreshResponse();
      const request = asType<RefreshRequest>({
        cookies: { refresh_token: 'cookie-refresh' },
      });
      mockAuthService.refreshTokens.mockResolvedValue({
        access_token: 'a',
        refresh_token: 'b',
      });

      await controller.refresh({}, request, response);
      expect(mockAuthService.refreshTokens).toHaveBeenCalledWith(
        'cookie-refresh',
      );
    });

    it('throws when refresh token is missing', async () => {
      const response = createRefreshResponse();
      const request = asType<RefreshRequest>({ cookies: {} });

      await expect(controller.refresh({}, request, response)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('logs out and clears cookies when token exists', async () => {
      const response = createLogoutResponse();
      const request = asType<LogoutRequest>({ cookies: {} });
      mockAuthService.logout.mockResolvedValue(undefined);

      await expect(
        controller.logoutUser(
          { refresh_token: 'logout-token' },
          request,
          response,
        ),
      ).resolves.toEqual({ message: 'Logged out successfully' });
      expect(mockAuthService.logout).toHaveBeenCalledWith('logout-token');
      expect(response.clearCookie).toHaveBeenCalledTimes(2);
    });

    it('clears cookies even when logout token is absent', async () => {
      const response = createLogoutResponse();
      const request = asType<LogoutRequest>({ cookies: {} });

      await expect(
        controller.logoutUser({}, request, response),
      ).resolves.toEqual({ message: 'Logged out successfully' });
      expect(mockAuthService.logout).not.toHaveBeenCalled();
      expect(response.clearCookie).toHaveBeenCalledTimes(2);
    });
  });

  describe('MFA endpoints', () => {
    it('verifies MFA and sets auth cookies', async () => {
      const response = createVerifyMfaResponse();
      const request = asType<VerifyMfaRequest>({
        ip: '127.0.0.1',
        headers: { 'user-agent': 'jest-agent' },
      });
      mockAuthService.loginAfterMfa.mockResolvedValue({
        access_token: 'access',
        refresh_token: 'refresh',
      });

      await expect(
        controller.verifyMfa(
          { mfa_challenge_token: 'challenge', code: '123456' },
          request,
          response,
        ),
      ).resolves.toEqual({
        access_token: 'access',
        refresh_token: 'refresh',
      });
      expect(mockAuthService.loginAfterMfa).toHaveBeenCalledWith(
        'challenge',
        '123456',
        {
          ipAddress: '127.0.0.1',
          userAgent: 'jest-agent',
        },
      );
      expect(response.cookie).toHaveBeenCalledTimes(2);
    });

    it('handles mfa setup and state transitions', async () => {
      mockMfaService.generateSetupSecret.mockResolvedValue({ qrCodeUrl: 'qr' });
      mockMfaService.enableMfa.mockResolvedValue({ backupCodes: ['code'] });
      mockMfaService.disableMfa.mockResolvedValue(undefined);
      mockMfaService.regenerateBackupCodes.mockResolvedValue({
        backupCodes: ['new-code'],
      });
      const request = createAuthenticatedRequest();

      await expect(controller.setupMfa(request)).resolves.toEqual({
        qrCodeUrl: 'qr',
      });
      await expect(
        controller.enableMfa(request, { code: '123456' }),
      ).resolves.toEqual({
        backupCodes: ['code'],
      });
      await expect(
        controller.disableMfa(request, { code: '123456' }),
      ).resolves.toEqual({ message: 'MFA disabled successfully' });
      await expect(
        controller.regenerateBackupCodes(request, { code: '123456' }),
      ).resolves.toEqual({
        backupCodes: ['new-code'],
      });
    });
  });

  describe('session management', () => {
    it('lists, revokes one, and revokes all sessions', async () => {
      mockAuthService.getSessions.mockResolvedValue([{ id: 's1' }]);
      mockAuthService.revokeSession.mockResolvedValue(undefined);
      mockAuthService.revokeAllSessions.mockResolvedValue(undefined);

      await expect(
        controller.getSessions(createAuthenticatedRequest()),
      ).resolves.toEqual([{ id: 's1' }]);
      await expect(
        controller.revokeSession(createAuthenticatedRequest(), 's1'),
      ).resolves.toEqual({ message: 'Session revoked successfully' });
      await expect(
        controller.revokeAllSessions(
          asType<RevokeAllSessionsRequest>({
            ...createAuthenticatedRequest(),
            cookies: { refresh_token: 'current-token' },
          }),
        ),
      ).resolves.toEqual({ message: 'All other sessions revoked' });

      expect(mockAuthService.revokeAllSessions).toHaveBeenCalledWith(
        'user-1',
        'current-token',
      );
    });
  });

  describe('email verification', () => {
    it('verifies email and resends verification', async () => {
      mockAuthService.verifyEmail.mockResolvedValue({ message: 'verified' });
      mockAuthService.sendVerificationEmail.mockResolvedValue({
        message: 'sent',
      });

      await expect(controller.verifyEmail({ token: 'token' })).resolves.toEqual(
        {
          message: 'verified',
        },
      );
      await expect(
        controller.resendVerification(createAuthenticatedRequest()),
      ).resolves.toEqual({ message: 'sent' });

      expect(mockAuthService.verifyEmail).toHaveBeenCalledWith('token');
      expect(mockAuthService.sendVerificationEmail).toHaveBeenCalledWith(
        'user-1',
      );
    });
  });

  describe('API key endpoints', () => {
    it('creates API key and converts expiresAt to Date', async () => {
      mockApiKeyService.createApiKey.mockResolvedValue({ id: 'key-1' });

      await expect(
        controller.createApiKey(
          createAuthenticatedRequest({
            user: { ...defaultAuthenticatedUser, clinicId: 'clinic-1' },
          }),
          {
            name: 'Integration Key',
            scopes: ['patients:read'],
            expiresAt: '2026-12-31T00:00:00.000Z',
          },
        ),
      ).resolves.toEqual({ id: 'key-1' });

      expect(mockApiKeyService.createApiKey).toHaveBeenCalledWith(
        'clinic-1',
        'user-1',
        {
          name: 'Integration Key',
          scopes: ['patients:read'],
          expiresAt: new Date('2026-12-31T00:00:00.000Z'),
        },
      );
    });

    it('lists and revokes API keys for clinic users', async () => {
      mockApiKeyService.listApiKeys.mockResolvedValue([{ id: 'key-1' }]);
      mockApiKeyService.revokeApiKey.mockResolvedValue(undefined);

      await expect(
        controller.listApiKeys(
          createAuthenticatedRequest({
            user: { ...defaultAuthenticatedUser, clinicId: 'clinic-1' },
          }),
        ),
      ).resolves.toEqual([{ id: 'key-1' }]);
      await expect(
        controller.revokeApiKey(
          createAuthenticatedRequest({
            user: { ...defaultAuthenticatedUser, clinicId: 'clinic-1' },
          }),
          'key-1',
        ),
      ).resolves.toEqual({ message: 'API key revoked successfully' });
      expect(mockApiKeyService.listApiKeys).toHaveBeenCalledWith('clinic-1');
      expect(mockApiKeyService.revokeApiKey).toHaveBeenCalledWith(
        'key-1',
        'clinic-1',
      );
    });

    it('throws when clinic context is missing for API key endpoints', async () => {
      const request = createAuthenticatedRequest({
        user: { ...defaultAuthenticatedUser, clinicId: '' },
      });

      await expect(
        controller.createApiKey(request, {
          name: 'Key',
          scopes: [],
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(controller.listApiKeys(request)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.revokeApiKey(request, 'id')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  afterEach(() => {
    loggerErrorSpy.mockRestore();
    loggerWarnSpy.mockRestore();
  });
});
