import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@workspace/db';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { AUTH_CONSTANTS } from '@/shared/modules/config/app-constants';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { IpRateLimitGuard } from '@/shared/modules/auth/guards/ip-rate-limit.guard';
import { asType } from '@/test-utils';
import { ApiKeyService } from './api-key.service';
import { AuthRegistrationController } from './auth-registration.controller';
import { AuthLoginController } from './auth-login.controller';
import { AuthPasswordController } from './auth-password.controller';
import { AuthSessionController } from './auth-session.controller';
import { AuthMfaController } from './auth-mfa.controller';
import { AuthVerificationController } from './auth-verification.controller';
import { AuthApiKeysController } from './auth-api-keys.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { MfaService } from './mfa.service';
import { SKIP_EMAIL_VERIFICATION_KEY } from '@/shared/modules/auth/guards/email-verified.guard';

describe('Auth controllers', () => {
  let registrationController: AuthRegistrationController;
  let loginController: AuthLoginController;
  let passwordController: AuthPasswordController;
  let sessionController: AuthSessionController;
  let mfaController: AuthMfaController;
  let verificationController: AuthVerificationController;
  let apiKeysController: AuthApiKeysController;
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

  type LoginRequest = Parameters<AuthLoginController['login']>[1];
  type LoginResponse = Parameters<AuthLoginController['login']>[2];
  type RegisterResponse = Parameters<AuthRegistrationController['register']>[1];
  type RefreshRequest = Parameters<AuthSessionController['refresh']>[1];
  type RefreshResponse = Parameters<AuthSessionController['refresh']>[2];
  type LogoutRequest = Parameters<AuthSessionController['logoutUser']>[1];
  type LogoutResponse = Parameters<AuthSessionController['logoutUser']>[2];
  type VerifyMfaRequest = Parameters<AuthLoginController['verifyMfa']>[1];
  type VerifyMfaResponse = Parameters<AuthLoginController['verifyMfa']>[2];
  type AuthenticatedRequest = Parameters<AuthSessionController['validate']>[0];
  type RevokeAllSessionsRequest = Parameters<
    AuthSessionController['revokeAllSessions']
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
      controllers: [
        AuthRegistrationController,
        AuthLoginController,
        AuthPasswordController,
        AuthSessionController,
        AuthMfaController,
        AuthVerificationController,
        AuthApiKeysController,
      ],
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

    registrationController = module.get(AuthRegistrationController);
    loginController = module.get(AuthLoginController);
    passwordController = module.get(AuthPasswordController);
    sessionController = module.get(AuthSessionController);
    mfaController = module.get(AuthMfaController);
    verificationController = module.get(AuthVerificationController);
    apiKeysController = module.get(AuthApiKeysController);
  });

  it('should be defined', () => {
    expect(registrationController).toBeDefined();
    expect(loginController).toBeDefined();
    expect(sessionController).toBeDefined();
  });

  describe('checkEmail', () => {
    it('returns exists flag', async () => {
      mockAuthService.checkEmailExists.mockResolvedValue(true);

      await expect(
        registrationController.checkEmail({ email: 'test@example.com' }),
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
        loginController.login(
          { email: 'test@example.com', password: 'password' },
          request,
          response,
        ),
        // Item 4: the refresh token is NOT echoed in the body (cookie only).
      ).resolves.toEqual({ access_token: 'access-token', user });

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
        loginController.login(
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
        loginController.login(
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
        loginController.login(
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

      await expect(
        registrationController.register(dto, response),
        // Item 4: body carries no refresh_token (cookie only).
      ).resolves.toEqual({ access_token: 'access-token' });
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
        registrationController.register(
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
        passwordController.forgotPassword({ email: 'test@example.com' }),
      ).resolves.toEqual({ message: 'ok' });
      expect(mockAuthService.requestPasswordReset).toHaveBeenCalledWith(
        'test@example.com',
      );
    });

    it('resets password through service', async () => {
      mockAuthService.resetPassword.mockResolvedValue({ message: 'reset' });

      await expect(
        passwordController.resetPassword({
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
        passwordController.changePassword(request, {
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
      const result = sessionController.validate(createAuthenticatedRequest());

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
        sessionController.refresh(
          { refresh_token: 'dto-refresh' },
          request,
          response,
        ),
        // Item 4: rotated refresh token stays in the cookie, not the body.
      ).resolves.toEqual({ access_token: 'new-access' });
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

      await sessionController.refresh({}, request, response);
      expect(mockAuthService.refreshTokens).toHaveBeenCalledWith(
        'cookie-refresh',
      );
    });

    it('throws when refresh token is missing', async () => {
      const response = createRefreshResponse();
      const request = asType<RefreshRequest>({ cookies: {} });

      await expect(
        sessionController.refresh({}, request, response),
      ).rejects.toThrow(BadRequestException);
    });

    it('logs out and clears cookies when token exists', async () => {
      const response = createLogoutResponse();
      const request = asType<LogoutRequest>({ cookies: {} });
      mockAuthService.logout.mockResolvedValue(undefined);

      await expect(
        sessionController.logoutUser(
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
        sessionController.logoutUser({}, request, response),
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
        loginController.verifyMfa(
          { mfa_challenge_token: 'challenge', code: '123456' },
          request,
          response,
        ),
        // Item 4: body carries no refresh_token (cookie only).
      ).resolves.toEqual({ access_token: 'access' });
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

      await expect(mfaController.setupMfa(request)).resolves.toEqual({
        qrCodeUrl: 'qr',
      });
      await expect(
        mfaController.enableMfa(request, { code: '123456' }),
      ).resolves.toEqual({
        backupCodes: ['code'],
      });
      await expect(
        mfaController.disableMfa(request, { code: '123456' }),
      ).resolves.toEqual({ message: 'MFA disabled successfully' });
      await expect(
        mfaController.regenerateBackupCodes(request, { code: '123456' }),
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
        sessionController.getSessions(createAuthenticatedRequest()),
      ).resolves.toEqual([{ id: 's1' }]);
      await expect(
        sessionController.revokeSession(createAuthenticatedRequest(), 's1'),
      ).resolves.toEqual({ message: 'Session revoked successfully' });
      await expect(
        sessionController.revokeAllSessions(
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

      await expect(
        verificationController.verifyEmail({ token: 'token' }),
      ).resolves.toEqual({
        message: 'verified',
      });
      await expect(
        verificationController.resendVerification(createAuthenticatedRequest()),
      ).resolves.toEqual({ message: 'sent' });

      expect(mockAuthService.verifyEmail).toHaveBeenCalledWith('token');
      expect(mockAuthService.sendVerificationEmail).toHaveBeenCalledWith(
        'user-1',
      );
    });

    it('marks resendVerification as skipping email verification guards', () => {
      const reflector = new Reflector();

      expect(
        reflector.getAllAndOverride<boolean>(SKIP_EMAIL_VERIFICATION_KEY, [
          verificationController.resendVerification,
          AuthVerificationController,
        ]),
      ).toBe(true);
    });
  });

  describe('API key endpoints', () => {
    it('creates API key and converts expiresAt to Date', async () => {
      mockApiKeyService.createApiKey.mockResolvedValue({ id: 'key-1' });

      await expect(
        apiKeysController.createApiKey(
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
        apiKeysController.listApiKeys(
          createAuthenticatedRequest({
            user: { ...defaultAuthenticatedUser, clinicId: 'clinic-1' },
          }),
        ),
      ).resolves.toEqual([{ id: 'key-1' }]);
      await expect(
        apiKeysController.revokeApiKey(
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
        apiKeysController.createApiKey(request, {
          name: 'Key',
          scopes: [],
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(apiKeysController.listApiKeys(request)).rejects.toThrow(
        BadRequestException,
      );
      await expect(
        apiKeysController.revokeApiKey(request, 'id'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  afterEach(() => {
    loggerErrorSpy.mockRestore();
    loggerWarnSpy.mockRestore();
  });
});
