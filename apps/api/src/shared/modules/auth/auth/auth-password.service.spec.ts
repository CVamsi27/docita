import {
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { AuthPasswordService } from './auth-password.service';
import type { EmailService } from '@/shared/modules/messaging/email/email.service';
import type { IClock } from '@/shared/common/ports/clock.port';

const NOW = new Date('2026-05-19T12:00:00.000Z');

type UserRecord = {
  id: string;
  email: string;
  password: string;
  passwordHistory: Array<{ passwordHash: string }>;
};

function makePrisma(initialUser: UserRecord | null) {
  let user: UserRecord | null = initialUser ? { ...initialUser } : null;
  return {
    runUnrestricted: async <T>(fn: () => Promise<T>) => fn(),
    user: {
      findUnique: jest.fn(async () => user) as jest.Mock,
      findFirst: jest.fn(async () => user) as jest.Mock,
      update: jest.fn(async () => user) as jest.Mock,
    },
    passwordHistory: {
      findMany: jest.fn(async () => []) as jest.Mock,
      deleteMany: jest.fn(async () => ({ count: 0 })) as jest.Mock,
      create: jest.fn(async () => ({})) as jest.Mock,
    },
    $transaction: jest.fn(async (ops: unknown) => {
      if (Array.isArray(ops)) {
        return Promise.all(ops as Promise<unknown>[]);
      }
      return (ops as (tx: unknown) => Promise<unknown>)(null);
    }) as jest.Mock,
    _setUser: (u: UserRecord | null) => {
      user = u;
    },
    _getUser: () => user,
  };
}

function makeClock(): IClock {
  return { now: () => NOW };
}

const policy = { validate: jest.fn() } as unknown as { validate: jest.Mock };

function makeService(
  prisma: ReturnType<typeof makePrisma>,
  email: jest.Mock,
) {
  return new AuthPasswordService(
    prisma as never,
    policy as never,
    { sendPasswordResetEmail: email } as unknown as EmailService,
    makeClock(),
  );
}

describe('AuthPasswordService.requestPasswordReset', () => {
  let emailSend: jest.Mock;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    policy.validate.mockReset();
    emailSend = jest.fn();
    (emailSend as jest.Mock).mockResolvedValue({ success: true } as never);
    prisma = makePrisma({
      id: 'u-1',
      email: 'doc@example.com',
      password: 'hashed-old',
      passwordHistory: [],
    });
  });

  it('persists a token and triggers the reset email when the user exists', async () => {
    const service = makeService(prisma, emailSend);

    const result = await service.requestPasswordReset('doc@example.com');

    expect(result).toEqual({
      message:
        'If an account with that email exists, a reset link has been sent.',
    });
    expect(emailSend).toHaveBeenCalledTimes(1);
    const [emailArg, tokenArg] = (emailSend.mock.calls[0] ?? []) as [string, string];
    expect(emailArg).toBe('doc@example.com');
    expect(typeof tokenArg).toBe('string');
    expect((tokenArg as string).length).toBeGreaterThanOrEqual(32);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'u-1' },
        data: expect.objectContaining({
          passwordResetToken: tokenArg,
          passwordResetExpiresAt: expect.any(Date),
        }),
      }),
    );
  });

  it('returns the same generic message when the email is unknown (no enumeration)', async () => {
    prisma._setUser(null);
    (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null as never);
    const service = makeService(prisma, emailSend);

    const result = await service.requestPasswordReset('unknown@example.com');

    expect(result).toEqual({
      message:
        'If an account with that email exists, a reset link has been sent.',
    });
    expect(emailSend).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('does not throw when the email is malformed — same generic response', async () => {
    const service = makeService(prisma, emailSend);

    const result = await service.requestPasswordReset('not-an-email');

    expect(result).toEqual({
      message:
        'If an account with that email exists, a reset link has been sent.',
    });
    expect(emailSend).not.toHaveBeenCalled();
  });

  it('still returns the generic success message when the provider rejects (do not leak provider state)', async () => {
    (emailSend as jest.Mock).mockResolvedValueOnce({
      success: false,
      error: 'provider_unavailable',
    } as never);
    const service = makeService(prisma, emailSend);

    const result = await service.requestPasswordReset('doc@example.com');

    expect(result).toEqual({
      message:
        'If an account with that email exists, a reset link has been sent.',
    });
  });
});

describe('AuthPasswordService.resetPassword', () => {
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    policy.validate.mockReset();
    prisma = makePrisma({
      id: 'u-1',
      email: 'doc@example.com',
      password: 'hashed-old',
      passwordHistory: [],
    });
    prisma.user.findFirst.mockImplementation(async () => prisma._getUser());
  });

  it('hashes the new password, updates the user, and records history', async () => {
    policy.validate.mockImplementation(() => undefined);
    (prisma.user.findFirst as jest.Mock).mockResolvedValueOnce({
      id: 'u-1',
      email: 'doc@example.com',
      password: 'hashed-old',
      passwordHistory: [],
    } as never);
    const service = makeService(prisma, jest.fn());

    const result = await service.resetPassword('good-token', 'NewPass123!');

    expect(result).toEqual({ message: 'Password has been reset successfully' });
    expect(policy.validate).toHaveBeenCalledWith('NewPass123!');
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.passwordHistory.create).toHaveBeenCalledWith({
      data: { userId: 'u-1', passwordHash: 'hashed-old' },
    });
  });

  it('rejects an unknown or expired token with BadRequest', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValueOnce(null as never);
    const service = makeService(prisma, jest.fn());

    await expect(
      service.resetPassword('bogus', 'NewPass123!'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('propagates a policy violation as BadRequest', async () => {
    policy.validate.mockImplementationOnce(() => {
      throw new BadRequestException('too weak');
    });
    (prisma.user.findFirst as jest.Mock).mockResolvedValueOnce({
      id: 'u-1',
      email: 'doc@example.com',
      password: 'hashed-old',
      passwordHistory: [],
    } as never);
    const service = makeService(prisma, jest.fn());

    await expect(
      service.resetPassword('good-token', 'weak'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
