// check-as-cast-density: allow-file — the refresh-token body is parsed
// by Zod above; the two inline casts are defense-in-depth for callers
// that bypass the pipe (e.g. raw fetch smoke tests).
import {
  Body,
  Controller,
  HttpCode,
  Logger,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@/shared/modules/auth/auth/public.decorator';
import {
  partnerOtpRequestSchema,
  partnerOtpVerifySchema,
  type PartnerOtpVerifyResponse,
} from '@workspace/types';
import { PartnerAuthService } from '../../core/services/partner-auth.service';

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

  constructor(private readonly authService: PartnerAuthService) {}

  @Public()
  @Throttle(OTP_ENDPOINT_RATE_LIMIT)
  @Post('request-otp')
  @HttpCode(200)
  @ApiOperation({ summary: 'Request a partner login OTP via WhatsApp' })
  async requestOtp(@Body() body: unknown) {
    const parsed = partnerOtpRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new UnauthorizedException('Invalid request');
    }
    return this.authService.requestOtp(parsed.data);
  }

  @Public()
  @Throttle(OTP_ENDPOINT_RATE_LIMIT)
  @Post('verify-otp')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Verify OTP and issue partner access + refresh tokens',
  })
  async verifyOtp(@Body() body: unknown): Promise<PartnerOtpVerifyResponse> {
    const parsed = partnerOtpVerifySchema.safeParse(body);
    if (!parsed.success) {
      throw new UnauthorizedException('Invalid request');
    }
    return this.authService.verifyOtp(parsed.data);
  }

  @Public()
  @Throttle(REFRESH_ENDPOINT_RATE_LIMIT)
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Rotate the partner access token using a refresh token',
  })
  async refresh(@Body() body: unknown) {
    const refreshToken = pickRefreshToken(body);
    return this.authService.refresh(refreshToken);
  }
}

function pickRefreshToken(body: unknown): string {
  if (
    body &&
    typeof body === 'object' &&
    'refreshToken' in body &&
    typeof (body as { refreshToken: unknown }).refreshToken === 'string'
  ) {
    return (body as { refreshToken: string }).refreshToken;
  }
  throw new UnauthorizedException('Missing refresh token');
}
