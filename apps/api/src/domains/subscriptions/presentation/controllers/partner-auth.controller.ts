// check-as-cast-density: allow-file — the refresh-token body is parsed
// by Zod above; the two inline casts are defense-in-depth for callers
// that bypass the pipe (e.g. raw fetch smoke tests).
import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Logger,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodSerializerDto } from 'nestjs-zod';
import type { Request } from 'express';
import { Public } from '@/shared/modules/auth/auth/public.decorator';
import {
  otpRequestAckResponseSchema,
  PARTNER_REFRESH_COOKIE_NAME,
  partnerOtpRequestSchema,
  partnerOtpVerifySchema,
  partnerOtpVerifyResponseSchema,
  partnerTokenRefreshResponseSchema,
  type PartnerOtpVerifyResponse,
} from '@workspace/types';
import { PartnerAuthService } from '../../core/services/partner-auth.service';
import type { PartnerOtpVerifyInternalResponse } from '../../core/services/partner-auth.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';

// Shared by `requestOtp` and `verifyOtp` — both are public OTP endpoints
// that need the same brute-force-resistant rate limit, so the threshold
// lives in one place rather than the two `@Throttle` configs drifting apart.
const OTP_ENDPOINT_RATE_LIMIT = {
  short: { ttl: 60_000, limit: 5 },
} as const;

const REFRESH_ENDPOINT_RATE_LIMIT = {
  short: { ttl: 60_000, limit: 30 },
} as const;

@ApiTags('partner-auth')
@Controller('partner/auth')
export class PartnerAuthController {
  private readonly logger = new Logger(PartnerAuthController.name);

  constructor(
    private readonly authService: PartnerAuthService,
    private readonly configService: AppConfigService,
  ) {}

  @Public()
  @Throttle(OTP_ENDPOINT_RATE_LIMIT)
  @Post('request-otp')
  @HttpCode(200)
  @ApiOperation({ summary: 'Request a partner login OTP via WhatsApp' })
  @ZodSerializerDto(otpRequestAckResponseSchema)
  async requestOtp(@Body() body: unknown) {
    const parsed = partnerOtpRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('Invalid request');
    }
    return this.authService.requestOtp(parsed.data);
  }

  @Public()
  @Throttle(OTP_ENDPOINT_RATE_LIMIT)
  @Post('verify-otp')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Verify OTP and issue partner access token + refresh cookie',
  })
  @ZodSerializerDto(partnerOtpVerifyResponseSchema)
  async verifyOtp(
    @Body() body: unknown,
    @Req() req: Request,
  ): Promise<PartnerOtpVerifyResponse> {
    const parsed = partnerOtpVerifySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('Invalid request');
    }
    const result: PartnerOtpVerifyInternalResponse =
      await this.authService.verifyOtp(parsed.data);
    // The refresh token is set as an httpOnly cookie — never exposed
    // to JavaScript (unlike localStorage, which is XSS-readable).
    req.res?.cookie(PARTNER_REFRESH_COOKIE_NAME, result.refreshToken, {
      path: '/',
      httpOnly: true,
      secure: this.configService.isProduction(),
      sameSite: 'strict',
      // 30-day TTL (the JWT expiry).
      maxAge: 30 * 24 * 60 * 60 * 1000,
      domain: this.configService.getSharedCookieDomain(),
    });
    // Return the access token and referrer metadata to the client.
    // The refresh token is never in the response body.
    return {
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
      referrer: result.referrer,
    };
  }

  @Public()
  @Throttle(REFRESH_ENDPOINT_RATE_LIMIT)
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Rotate the partner access token using the refresh cookie',
  })
  @ZodSerializerDto(partnerTokenRefreshResponseSchema)
  async refresh(@Req() req: Request) {
    const refreshToken = req.cookies?.[PARTNER_REFRESH_COOKIE_NAME];
    if (!refreshToken || typeof refreshToken !== 'string') {
      throw new UnauthorizedException('Missing refresh token');
    }
    const result = await this.authService.refresh(refreshToken);
    // Return only the new access token — the refresh cookie is
    // already set on the client by the browser.
    return {
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
    };
  }
}
