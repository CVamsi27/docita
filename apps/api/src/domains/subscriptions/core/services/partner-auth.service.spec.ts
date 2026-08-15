import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PartnerAuthService } from './partner-auth.service';
import { IWhatsAppClient } from '@/domains/whatsapp/application/ports/whatsapp-client.port';
import { PrismaService } from '@/prisma/prisma.service';
import { IClock } from '@/shared/common/ports/clock.port';
import { createFixedClockMock } from '@/test-utils';
import { JWT_AUDIENCE_PARTNER } from '@/shared/modules/auth/auth/jwt-audience';

const JWT_SECRET = 'test-partner-auth-secret';

interface FakeReferrer {
  id: string;
  phone: string;
  active: boolean;
  name: string;
  code: string;
  type: 'CLINIC' | 'PHARMACY' | 'MARKETING_PERSON' | 'CUSTOM';
}

interface FakeOtpChallenge {
  id: string;
  phone: string;
  otpHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  attempts: number;
  createdAt: Date;
}

class FakePrismaService {
  referrers: FakeReferrer[] = [];
  otps: FakeOtpChallenge[] = [];

  buildClient(): PrismaService {
    return {
      referrer: {
        findFirst: jest.fn(
          async (args: { where: { phone: string; active?: boolean } }) => {
            return (
              this.referrers.find(
                (r) =>
                  r.phone === args.where.phone &&
                  (args.where.active === undefined ||
                    r.active === args.where.active),
              ) ?? null
            );
          },
        ),
        findUnique: jest.fn(async (args: { where: { id: string } }) => {
          return this.referrers.find((r) => r.id === args.where.id) ?? null;
        }),
      },
      partnerOtpChallenge: {
        updateMany: jest.fn(
          async (args: {
            where: {
              id?: string;
              phone?: string;
              usedAt?: Date | null;
              attempts?: { lt?: number };
            };
            data: { usedAt?: Date; attempts?: { increment?: number } };
          }) => {
            let count = 0;
            for (const o of this.otps) {
              if (args.where.id !== undefined && o.id !== args.where.id) {
                continue;
              }
              if (
                args.where.phone !== undefined &&
                o.phone !== args.where.phone
              ) {
                continue;
              }
              if (args.where.usedAt === null && o.usedAt !== null) {
                continue;
              }
              if (
                args.where.attempts?.lt !== undefined &&
                !(o.attempts < args.where.attempts.lt)
              ) {
                continue;
              }
              if (args.data.usedAt !== undefined) o.usedAt = args.data.usedAt;
              if (args.data.attempts?.increment !== undefined) {
                o.attempts += args.data.attempts.increment;
              }
              count += 1;
            }
            return { count };
          },
        ),
        create: jest.fn(
          async (args: {
            data: { phone: string; otpHash: string; expiresAt: Date };
          }) => {
            const id = `otp_${this.otps.length + 1}`;
            const row: FakeOtpChallenge = {
              id,
              phone: args.data.phone,
              otpHash: args.data.otpHash,
              expiresAt: args.data.expiresAt,
              usedAt: null,
              attempts: 0,
              createdAt: new Date(),
            };
            this.otps.push(row);
            return row;
          },
        ),
        findFirst: jest.fn(
          async (args: {
            where: { phone: string; usedAt: null; expiresAt: { gt: Date } };
          }) => {
            return (
              [...this.otps]
                .reverse()
                .find(
                  (o) =>
                    o.phone === args.where.phone &&
                    o.usedAt === null &&
                    o.expiresAt > args.where.expiresAt.gt,
                ) ?? null
            );
          },
        ),
        update: jest.fn(
          async (args: { where: { id: string }; data: { usedAt: Date } }) => {
            const o = this.otps.find((x) => x.id === args.where.id);
            if (!o) throw new Error('not found');
            o.usedAt = args.data.usedAt;
            return o;
          },
        ),
      },
    } as unknown as PrismaService;
  }
}

function makeWhatsapp(): jest.Mocked<IWhatsAppClient> {
  return {
    sendMessage: jest.fn(async () => ({ externalId: 'wamid.1' })),
  } as unknown as jest.Mocked<IWhatsAppClient>;
}

describe('PartnerAuthService', () => {
  let prisma: FakePrismaService;
  let jwt: JwtService;
  let whatsapp: IWhatsAppClient;
  let clock: IClock;
  let service: PartnerAuthService;

  beforeEach(() => {
    prisma = new FakePrismaService();
    jwt = new JwtService({ secret: JWT_SECRET });
    whatsapp = makeWhatsapp();
    clock = createFixedClockMock('2026-07-27T12:00:00.000Z');

    process.env.JWT_SECRET = JWT_SECRET;
    // AppConfigService is never read directly by the auth service — it
    // goes through JwtService options at construction. We pass the
    // secret in via the JwtService signing path below.
    service = new PartnerAuthService(
      prisma.buildClient(),
      jwt,
      whatsapp,
      clock,
    );
  });

  describe('requestOtp', () => {
    it('returns the same success shape whether or not a referrer matches (non-enumerable)', async () => {
      const r1 = await service.requestOtp({ phone: '+919999999999' });
      expect(r1.message).toMatch(/OTP/);
      expect(r1.expiresInSeconds).toBe(600);

      prisma.referrers.push({
        id: 'rfr_1',
        phone: '+919999999998',
        active: true,
        name: 'Anil',
        code: 'RFR-AB23CD',
        type: 'PHARMACY',
      });
      const r2 = await service.requestOtp({ phone: '+919999999998' });
      expect(r2.message).toBe(r1.message);
      expect(r2.expiresInSeconds).toBe(r1.expiresInSeconds);
    });

    it('does not call WhatsApp when no referrer matches', async () => {
      await service.requestOtp({ phone: '+919999999999' });
      expect(whatsapp.sendMessage).not.toHaveBeenCalled();
    });

    it('creates an OTP challenge and calls WhatsApp for a matching referrer', async () => {
      prisma.referrers.push({
        id: 'rfr_1',
        phone: '+919999999998',
        active: true,
        name: 'Anil',
        code: 'RFR-AB23CD',
        type: 'PHARMACY',
      });
      await service.requestOtp({ phone: '+919999999998' });
      expect(prisma.otps).toHaveLength(1);
      expect(whatsapp.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '+919999999998',
          templateName: 'partner_login_otp',
        }),
      );
    });

    it('invalidates prior outstanding challenges for the same phone', async () => {
      prisma.referrers.push({
        id: 'rfr_1',
        phone: '+919999999998',
        active: true,
        name: 'Anil',
        code: 'RFR-AB23CD',
        type: 'PHARMACY',
      });
      await service.requestOtp({ phone: '+919999999998' });
      await service.requestOtp({ phone: '+919999999998' });
      // First OTP should now be marked used (invalidated).
      expect(prisma.otps[0]?.usedAt).toBeInstanceOf(Date);
      // And the new one is fresh.
      expect(prisma.otps[1]?.usedAt).toBeNull();
    });

    it('normalizes spaces and dashes in the phone before lookup', async () => {
      prisma.referrers.push({
        id: 'rfr_1',
        phone: '+919999999998',
        active: true,
        name: 'Anil',
        code: 'RFR-AB23CD',
        type: 'PHARMACY',
      });
      await service.requestOtp({ phone: '+91 999-9999-998' });
      expect(whatsapp.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({ to: '+919999999998' }),
      );
    });
  });

  describe('verifyOtp', () => {
    async function seedOtp(plainOtp: string, phone: string) {
      const otpHash = await bcrypt.hash(plainOtp, 4);
      prisma.referrers.push({
        id: 'rfr_1',
        phone,
        active: true,
        name: 'Anil',
        code: 'RFR-AB23CD',
        type: 'PHARMACY',
      });
      await service.requestOtp({ phone });
      // requestOtp created an OTP with an unknown plaintext; rewrite the
      // hash so we can verify against a known one.
      const otp = prisma.otps[prisma.otps.length - 1];
      if (otp) otp.otpHash = otpHash;
    }

    it('rejects when no live OTP exists for the phone', async () => {
      await expect(
        service.verifyOtp({ phone: '+919999999999', otp: '123456' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects an expired OTP', async () => {
      prisma.referrers.push({
        id: 'rfr_1',
        phone: '+919999999998',
        active: true,
        name: 'Anil',
        code: 'RFR-AB23CD',
        type: 'PHARMACY',
      });
      await service.requestOtp({ phone: '+919999999998' });
      // Force the only OTP to be expired.
      const otp = prisma.otps[0];
      if (otp) {
        otp.expiresAt = new Date(clock.now().getTime() - 1000);
      }
      await expect(
        service.verifyOtp({ phone: '+919999999998', otp: '123456' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects a wrong OTP without consuming the slot beyond the cap', async () => {
      const PHONE = '+919999999998';
      await seedOtp('111111', PHONE);
      await expect(
        service.verifyOtp({ phone: PHONE, otp: '222222' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects after the attempts cap is reached', async () => {
      const PHONE = '+919999999998';
      await seedOtp('111111', PHONE);
      // Burn through the cap with wrong attempts.
      for (let i = 0; i < 3; i += 1) {
        await expect(
          service.verifyOtp({ phone: PHONE, otp: '000000' }),
        ).rejects.toBeInstanceOf(UnauthorizedException);
      }
      // 4th attempt is locked.
      await expect(
        service.verifyOtp({ phone: PHONE, otp: '111111' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('issues a partner access + refresh token pair on success', async () => {
      const PHONE = '+919999999998';
      await seedOtp('111111', PHONE);
      const result = await service.verifyOtp({ phone: PHONE, otp: '111111' });
      expect(result.accessToken).toMatch(/\./);
      expect(result.refreshToken).toMatch(/\./);
      expect(result.expiresIn).toBe(15 * 60);
      expect(result.referrer).toEqual({
        id: 'rfr_1',
        name: 'Anil',
        code: 'RFR-AB23CD',
        type: 'PHARMACY',
      });
      // The challenge should be marked used.
      expect(prisma.otps[0]?.usedAt).toBeInstanceOf(Date);
    });

    it('round-trips a refresh token into an access token', async () => {
      const PHONE = '+919999999998';
      await seedOtp('111111', PHONE);
      const { refreshToken } = await service.verifyOtp({
        phone: PHONE,
        otp: '111111',
      });

      const rotated = await service.refresh(refreshToken);
      expect(rotated.accessToken).toMatch(/\./);
      expect(rotated.expiresIn).toBe(15 * 60);
    });

    it('rejects a refresh token with the wrong audience', async () => {
      const forged = jwt.sign(
        { sub: 'rfr_1', phone: '+919999999998', type: 'refresh' },
        { secret: JWT_SECRET, audience: 'some-other-audience' },
      );
      await expect(service.refresh(forged)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('rejects a refresh token of the wrong type', async () => {
      const forged = jwt.sign(
        { sub: 'rfr_1', phone: '+919999999998', type: 'access' },
        { secret: JWT_SECRET, audience: JWT_AUDIENCE_PARTNER },
      );
      await expect(service.refresh(forged)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('rejects an access token of the wrong type via verifyAccessToken', async () => {
      const refresh = jwt.sign(
        { sub: 'rfr_1', phone: '+919999999998', type: 'refresh' },
        { secret: JWT_SECRET, audience: JWT_AUDIENCE_PARTNER },
      );
      await expect(service.verifyAccessToken(refresh)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('round-trips an access token via verifyAccessToken', async () => {
      const PHONE = '+919999999998';
      await seedOtp('111111', PHONE);
      const { accessToken } = await service.verifyOtp({
        phone: PHONE,
        otp: '111111',
      });
      const claims = await service.verifyAccessToken(accessToken);
      expect(claims.sub).toBe('rfr_1');
      expect(claims.phone).toBe(PHONE);
      expect(claims.type).toBe('access');
    });

    it('rejects a valid access token once the referrer is deactivated', async () => {
      const PHONE = '+919999999998';
      await seedOtp('111111', PHONE);
      const { accessToken } = await service.verifyOtp({
        phone: PHONE,
        otp: '111111',
      });

      // Deactivate after login — the same state the internal console sets.
      const referrer = prisma.referrers.find((r) => r.id === 'rfr_1');
      if (referrer) referrer.active = false;

      await expect(
        service.verifyAccessToken(accessToken),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects refresh once the referrer is deactivated', async () => {
      const PHONE = '+919999999998';
      await seedOtp('111111', PHONE);
      const { refreshToken } = await service.verifyOtp({
        phone: PHONE,
        otp: '111111',
      });

      const referrer = prisma.referrers.find((r) => r.id === 'rfr_1');
      if (referrer) referrer.active = false;

      await expect(service.refresh(refreshToken)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });
});
