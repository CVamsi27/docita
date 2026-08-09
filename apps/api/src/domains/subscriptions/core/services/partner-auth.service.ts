import {
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'node:crypto';
import {
  WHATSAPP_CLIENT_TOKEN,
  type IWhatsAppClient,
} from '@/domains/whatsapp/application/ports/whatsapp-client.port';
import { PrismaService } from '@/prisma/prisma.service';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import {
  JWT_AUDIENCE_PARTNER,
  isPartnerJwtAudience,
} from '@/shared/modules/auth/auth/jwt-audience';
import { sendLoginOtp } from '@/shared/whatsapp/whatsapp-login-otp.helper';
import {
  type PartnerOtpRequest,
  type PartnerOtpVerify,
  type PartnerOtpVerifyResponse,
} from '@workspace/types';

// TTLs are module-local by design (no external importers). If a spec ever
// needs to reference one, add a bottom-of-file re-export for it.
const PARTNER_OTP_TTL_MS = 10 * 60 * 1000;
const PARTNER_OTP_MAX_ATTEMPTS = 3;
const PARTNER_ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const PARTNER_REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

interface PartnerJwtClaims {
  sub: string;
  phone: string;
  type: 'access' | 'refresh';
}

@Injectable()
export class PartnerAuthService {
  private readonly logger = new Logger(PartnerAuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    @Inject(WHATSAPP_CLIENT_TOKEN) private readonly whatsapp: IWhatsAppClient,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  /**
   * Request a login OTP. The phone must match an active `Referrer.phone`;
   * we always return success (with a short expiry hint) regardless of
   * whether a row matched, so the endpoint is non-enumerable.
   */
  async requestOtp(input: PartnerOtpRequest) {
    const phone = this.normalizePhone(input.phone);
    const referrer = await this.prisma.referrer.findFirst({
      where: { phone, active: true },
      select: { id: true, name: true, code: true, type: true },
    });

    if (referrer) {
      const otp = this.generateOtp();
      const otpHash = await bcrypt.hash(otp, 10);
      const expiresAt = new Date(
        this.clock.now().getTime() + PARTNER_OTP_TTL_MS,
      );

      // Invalidate any prior outstanding challenges for this phone.
      await this.prisma.partnerOtpChallenge.updateMany({
        where: { phone, usedAt: null },
        data: { usedAt: this.clock.now() },
      });
      await this.prisma.partnerOtpChallenge.create({
        data: { phone, otpHash, expiresAt },
      });

      await sendLoginOtp(this.whatsapp, this.logger, 'partner', {
        to: phone,
        templateName: 'partner_login_otp',
        otp,
      });
    }

    return {
      message: 'If an active partner matches this phone, an OTP has been sent.',
      expiresInSeconds: PARTNER_OTP_TTL_MS / 1000,
    };
  }

  /**
   * Verify the OTP and issue a partner access + refresh token pair.
   * The access token is the bearer credential the portal uses on
   * every subsequent request; the refresh token is a longer-lived
   * JWT of the same shape (no DB row) used to mint new access tokens.
   */
  async verifyOtp(input: PartnerOtpVerify): Promise<PartnerOtpVerifyResponse> {
    const phone = this.normalizePhone(input.phone);
    const now = this.clock.now();

    const otpRecord = await this.prisma.partnerOtpChallenge.findFirst({
      where: { phone, usedAt: null, expiresAt: { gt: now } },
      orderBy: { createdAt: 'desc' },
    });
    if (!otpRecord) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    // Atomic cap check: increment and check in a single UPDATE so concurrent
    // attempts can't all observe attempts < MAX and all run bcrypt.compare.
    const consumed = await this.prisma.partnerOtpChallenge.updateMany({
      where: {
        id: otpRecord.id,
        usedAt: null,
        attempts: { lt: PARTNER_OTP_MAX_ATTEMPTS },
      },
      data: { attempts: { increment: 1 } },
    });
    if (consumed.count === 0) {
      throw new UnauthorizedException(
        'Too many attempts. Please request a new OTP.',
      );
    }

    const isValid = await bcrypt.compare(input.otp, otpRecord.otpHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid OTP');
    }

    await this.prisma.partnerOtpChallenge.update({
      where: { id: otpRecord.id },
      data: { usedAt: this.clock.now() },
    });

    const referrer = await this.prisma.referrer.findFirst({
      where: { phone, active: true },
      select: { id: true, name: true, code: true, type: true },
    });
    if (!referrer) {
      throw new UnauthorizedException('Partner not found');
    }

    const accessToken = this.signPartnerToken(
      { sub: referrer.id, phone, type: 'access' },
      PARTNER_ACCESS_TOKEN_TTL_SECONDS,
    );
    const refreshToken = this.signPartnerToken(
      { sub: referrer.id, phone, type: 'refresh' },
      PARTNER_REFRESH_TOKEN_TTL_SECONDS,
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: PARTNER_ACCESS_TOKEN_TTL_SECONDS,
      referrer: {
        id: referrer.id,
        name: referrer.name,
        code: referrer.code ?? '',
        type: referrer.type,
      },
    };
  }

  /**
   * Mint a new access token from a valid refresh token. The refresh
   * token must be a partner JWT with `type: 'refresh'` and a still-valid
   * expiry. No DB lookup — pure JWT rotation, intentional trade-off
   * for v1 (no revocation; if that's ever needed we can add a
   * PartnerRefreshToken table later).
   */
  async refresh(
    refreshToken: string,
  ): Promise<{ accessToken: string; expiresIn: number }> {
    let claims: PartnerJwtClaims;
    try {
      claims = await this.jwt.verifyAsync<PartnerJwtClaims>(refreshToken, {
        audience: JWT_AUDIENCE_PARTNER,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (
      claims.type !== 'refresh' ||
      !isPartnerJwtAudience(JWT_AUDIENCE_PARTNER)
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const accessToken = this.signPartnerToken(
      { sub: claims.sub, phone: claims.phone, type: 'access' },
      PARTNER_ACCESS_TOKEN_TTL_SECONDS,
    );
    return {
      accessToken,
      expiresIn: PARTNER_ACCESS_TOKEN_TTL_SECONDS,
    };
  }

  /** Verify a partner access token and return the referrerId + phone claims. */
  async verifyAccessToken(token: string): Promise<PartnerJwtClaims> {
    let claims: PartnerJwtClaims;
    try {
      claims = await this.jwt.verifyAsync<PartnerJwtClaims>(token, {
        audience: JWT_AUDIENCE_PARTNER,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
    if (claims.type !== 'access') {
      throw new UnauthorizedException('Wrong token type');
    }
    return claims;
  }

  private signPartnerToken(claims: PartnerJwtClaims, expiresInSeconds: number) {
    return this.jwt.sign(claims, {
      audience: JWT_AUDIENCE_PARTNER,
      expiresIn: expiresInSeconds,
    });
  }

  private generateOtp(): string {
    // 6-digit OTP. `randomInt`'s max is exclusive, so 1_000_000 to include
    // 999_999 in the sample space. The leading-zero pad keeps the OTP
    // always 6 chars so the WhatsApp template renders correctly.
    return randomInt(0, 1_000_000).toString().padStart(6, '0');
  }

  private normalizePhone(raw: string): string {
    // Tolerant: trim, strip spaces and dashes. We don't enforce country
    // here; the public-booking pattern matches the same way. The unique
    // constraint is on the post-normalization string, so duplicates
    // (e.g. `+91 98xxx` vs `+9198xxx`) collapse to one.
    return raw.replace(/[\s-]/g, '').trim();
  }
}

