import {
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AuthEmailVerificationService } from './auth-email-verification.service';
import type { EmailService } from '@/shared/modules/messaging/email/email.service';
import type { IClock } from '@/shared/common/ports/clock.port';

const NOW = new Date('2026-05-19T12:00:00.000Z');

type UserRecord = {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
};

function makePrisma(initialUser: UserRecord | null) {
  let user: UserRecord | null = initialUser ? { ...initialUser } : null;
  return {
    runUnrestricted: async <T>(fn: () => Promise<T>) => fn(),
    user: {
      findUnique: jest.fn(async () => user) as jest.Mock,
      findFirst: jest.fn(async () => ({ id: user?.id ?? null })) as jest.Mock,
      update: jest.fn(async () => user) as jest.Mock,
    },
  };
}

function makeClock(): IClock {
  return { now: () => NOW };
}

function makeService(
  prisma: ReturnType<typeof makePrisma>,
  email: jest.Mock,
) {
  return new AuthEmailVerificationService(
    prisma as never,
    { sendVerificationEmail: email } as unknown as EmailService,
    makeClock(),
  );
}

describe('AuthEmailVerificationService', () => {
  let emailSend: jest.Mock;

  beforeEach(() => {
    emailSend = jest.fn();
    (emailSend as jest.Mock).mockResolvedValue({ success: true, messageId: 'msg-1' } as never);
  });

  describe('sendVerificationEmail', () => {
    it('issues a token and sends the email with the token in the URL', async () => {
      const prisma = makePrisma({
        id: 'u-1',
        email: 'doc@example.com',
        name: 'Doc',
        emailVerified: false,
      });
      const service = makeService(prisma, emailSend);

      const result = await service.sendVerificationEmail('u-1');

      expect(result).toEqual({ message: 'Verification email sent' });
      expect(emailSend).toHaveBeenCalledTimes(1);
      const calls = emailSend.mock.calls as Array<[string, string, string]>;
      const tokenArg = calls[0]?.[2];
      expect(typeof tokenArg).toBe('string');
      expect((tokenArg as string).length).toBeGreaterThanOrEqual(32);
      // Token is persisted on the user with a 24h expiry.
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'u-1' },
          data: expect.objectContaining({
            emailVerificationToken: tokenArg,
            emailVerificationExpiresAt: new Date(
              NOW.getTime() + 24 * 60 * 60 * 1000,
            ),
          }),
        }),
      );
    });

    it('refuses to send when the user is already verified', async () => {
      const prisma = makePrisma({
        id: 'u-1',
        email: 'doc@example.com',
        name: 'Doc',
        emailVerified: true,
      });
      const service = makeService(prisma, emailSend);

      await expect(
        service.sendVerificationEmail('u-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(emailSend).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('refuses to send for an unknown user', async () => {
      const prisma = makePrisma({
        id: 'u-1',
        email: 'doc@example.com',
        name: 'Doc',
        emailVerified: false,
      });
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null as never);
      const service = makeService(prisma, emailSend);

      await expect(
        service.sendVerificationEmail('missing'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(emailSend).not.toHaveBeenCalled();
    });

    it('surfaces a 503 when the email provider rejects the send', async () => {
      const prisma = makePrisma({
        id: 'u-1',
        email: 'doc@example.com',
        name: 'Doc',
        emailVerified: false,
      });
      (emailSend as jest.Mock).mockResolvedValueOnce({
        success: false,
        error: 'provider_unavailable',
      } as never);
      const service = makeService(prisma, emailSend);

      await expect(
        service.sendVerificationEmail('u-1'),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });
  });

  describe('verifyEmail', () => {
    it('marks the user verified and clears the token when valid', async () => {
      const prisma = makePrisma({
        id: 'u-1',
        email: 'doc@example.com',
        name: 'Doc',
        emailVerified: false,
      });
      const service = makeService(prisma, emailSend);

      const result = await service.verifyEmail('valid-token');

      expect(result).toEqual({ message: 'Email verified successfully' });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u-1' },
        data: {
          emailVerified: true,
          emailVerificationToken: null,
          emailVerificationExpiresAt: null,
        },
      });
    });

    it('rejects an unknown or expired token', async () => {
      const prisma = makePrisma({
        id: 'u-1',
        email: 'doc@example.com',
        name: 'Doc',
        emailVerified: false,
      });
      (prisma.user.findFirst as jest.Mock).mockResolvedValueOnce(null as never);
      const service = makeService(prisma, emailSend);

      await expect(service.verifyEmail('bogus')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });
});
