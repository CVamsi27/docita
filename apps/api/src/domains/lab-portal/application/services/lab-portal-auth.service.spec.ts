import { UnauthorizedException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { LabPortalAuthCommandService } from './lab-portal-auth.service';
import { Role } from '@workspace/db';
import type { AuthService } from '@/shared/modules/auth/auth/auth.service';
import type { AuthSessionService } from '@/shared/modules/auth/auth/auth-session.service';

describe('LabPortalAuthCommandService.login', () => {
  let service: LabPortalAuthCommandService;
  const validateUser = jest.fn<(...args: unknown[]) => Promise<unknown>>();
  const login = jest.fn<(...args: unknown[]) => Promise<unknown>>();

  beforeEach(() => {
    jest.clearAllMocks();
    const authService = { validateUser } as unknown as AuthService;
    const authSessionService = { login } as unknown as AuthSessionService;
    service = new LabPortalAuthCommandService(authService, authSessionService);
  });

  const dto = { email: 'tech@lab.test', password: 'secret' };

  it('issues a session for a valid LAB user', async () => {
    const labUser = { id: 'u1', role: Role.LAB };
    validateUser.mockResolvedValue(labUser);
    login.mockResolvedValue({ accessToken: 'jwt' });

    const result = await service.login(dto);

    expect(validateUser).toHaveBeenCalledWith(dto.email, dto.password);
    expect(login).toHaveBeenCalledWith(labUser);
    expect(result).toEqual({ accessToken: 'jwt' });
  });

  it('rejects invalid credentials (no user)', async () => {
    validateUser.mockResolvedValue(null);
    await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    expect(login).not.toHaveBeenCalled();
  });

  it('rejects a valid user whose role is not LAB', async () => {
    validateUser.mockResolvedValue({ id: 'u2', role: Role.DOCTOR });
    await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    expect(login).not.toHaveBeenCalled();
  });
});
