import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ApiKeyService } from '@/shared/modules/auth/auth/api-key.service';
import { asType } from '@/test-utils';
import { ApiKeyGuard } from './api-key.guard';

function createContext(request: Record<string, unknown>): ExecutionContext {
  return asType<ExecutionContext>({
    switchToHttp: (() => ({
      getRequest: () => request,
      getResponse: () => ({}),
      getNext: () => undefined,
    })) as ExecutionContext['switchToHttp'],
    getHandler: () => () => undefined,
    getClass: () => ApiKeyGuard,
  });
}

describe('ApiKeyGuard', () => {
  let apiKeyService: jest.Mocked<Pick<ApiKeyService, 'validateApiKey'>>;
  let guard: ApiKeyGuard;
  let reflector: jest.Mocked<Pick<Reflector, 'getAllAndOverride'>>;

  beforeEach(() => {
    apiKeyService = {
      validateApiKey: jest.fn(),
    };
    reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([]),
    };
    guard = new ApiKeyGuard(
      asType<ApiKeyService>(apiKeyService),
      asType<Reflector>(reflector),
    );
  });

  it('throws when API key header is missing', async () => {
    await expect(
      guard.canActivate(createContext({ headers: {} })),
    ).rejects.toThrow(UnauthorizedException);
    expect(apiKeyService.validateApiKey).not.toHaveBeenCalled();
  });

  it('throws when API key is invalid', async () => {
    apiKeyService.validateApiKey.mockResolvedValue(null);

    await expect(
      guard.canActivate(
        createContext({ headers: { authorization: 'ApiKey invalid' } }),
      ),
    ).rejects.toThrow(UnauthorizedException);
    expect(apiKeyService.validateApiKey).toHaveBeenCalledWith(
      'invalid',
      undefined,
    );
  });

  it('attaches clinic and scopes for valid API key', async () => {
    apiKeyService.validateApiKey.mockResolvedValue({
      clinicId: 'clinic-1',
      scopes: ['read:patients'],
    });
    const request: Record<string, unknown> = {
      headers: { authorization: 'ApiKey valid-key' },
    };

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect(request.apiKeyClinicId).toBe('clinic-1');
    expect(request.apiKeyScopes).toEqual(['read:patients']);
  });

  it('rejects a key that lacks a required route scope', async () => {
    apiKeyService.validateApiKey.mockResolvedValue({
      clinicId: 'clinic-1',
      scopes: ['patients:read'],
    });
    reflector.getAllAndOverride.mockReturnValue(['appointments:write']);

    await expect(
      guard.canActivate(
        createContext({ headers: { authorization: 'ApiKey valid-key' } }),
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('accepts a domain wildcard for a required route scope', async () => {
    apiKeyService.validateApiKey.mockResolvedValue({
      clinicId: 'clinic-1',
      scopes: ['appointments:*'],
    });
    reflector.getAllAndOverride.mockReturnValue(['appointments:write']);

    await expect(
      guard.canActivate(
        createContext({ headers: { authorization: 'ApiKey valid-key' } }),
      ),
    ).resolves.toBe(true);
  });
});
