import {
  Controller,
  Post,
  Body,
  Res,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ZodSerializerDto, createZodDto } from 'nestjs-zod';
import { Response } from 'express';
import { z } from 'zod';
import {
  loginWireResponseSchema,
  otpRequestAckResponseSchema,
} from '@workspace/types';
import { Public } from '@/shared/modules/auth/auth/public.decorator';
import { PatientPortalAuthService } from '@/domains/patient-portal/application/services/patient-portal-auth.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { AUTH_CONSTANTS } from '@/shared/modules/config/app-constants';
import { stripRefreshTokenFromBody } from '@/shared/modules/auth/auth/auth-cookie.helpers';

// Shared by `requestOtp` and `verifyOtp` — both are public OTP endpoints
// that need the same brute-force-resistant rate limit, so the threshold
// lives in one place rather than the two `@Throttle` configs drifting apart.
const OTP_ENDPOINT_RATE_LIMIT = {
  short: {
    ttl: 60000,
    limit: 5,
  },
} as const;

// Both routes were hand-written `class { field!: string }` types: the
// compiler was satisfied but nothing validated at runtime, so a caller
// sending `{}` reached the service with `undefined`. These validate the
// shape and reject the request before any OTP lookup or WhatsApp send.
const requestOtpSchema = z.object({
  phoneNumber: z.string().min(1, 'phoneNumber is required'),
});

const verifyOtpSchema = z.object({
  phoneNumber: z.string().min(1, 'phoneNumber is required'),
  otp: z.string().min(1, 'otp is required'),
});

export class RequestOtpDto extends createZodDto(requestOtpSchema) {}
export class VerifyOtpDto extends createZodDto(verifyOtpSchema) {}

@ApiTags('patient-portal-auth')
@Controller('patient-portal/auth')
export class PatientPortalAuthController {
  private readonly logger = new Logger(PatientPortalAuthController.name);

  constructor(
    private readonly authService: PatientPortalAuthService,
    private readonly configService: AppConfigService,
  ) {}

  private getCookieOptions() {
    const isProduction = this.configService.isProduction();
    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict' as const,
      path: '/',
    };
  }

  private setAuthCookies(
    res: Response,
    tokens: { access_token: string; refresh_token: string },
  ) {
    const cookieOptions = this.getCookieOptions();
    res.cookie('access_token', tokens.access_token, {
      ...cookieOptions,
      maxAge: AUTH_CONSTANTS.ACCESS_TOKEN_MAX_AGE_MS,
    });
    res.cookie('refresh_token', tokens.refresh_token, {
      ...cookieOptions,
      maxAge: AUTH_CONSTANTS.REFRESH_TOKEN_MAX_AGE_MS,
      path: '/api/v1/auth',
    });
  }

  @Public()
  @Throttle(OTP_ENDPOINT_RATE_LIMIT)
  @Post('request-otp')
  @ApiOperation({ summary: 'Request OTP for patient portal login' })
  @ApiResponse({ status: 200, description: 'OTP sent if account exists' })
  @ZodSerializerDto(otpRequestAckResponseSchema)
  async requestOtp(@Body() dto: RequestOtpDto) {
    if (!dto.phoneNumber)
      throw new BadRequestException('phoneNumber is required');
    return this.authService.requestOtp(dto.phoneNumber);
  }

  @Public()
  @Throttle(OTP_ENDPOINT_RATE_LIMIT)
  @Post('verify-otp')
  @ApiOperation({ summary: 'Verify OTP and log in to patient portal' })
  @ApiResponse({ status: 200, description: 'Successfully logged in' })
  @ApiResponse({ status: 401, description: 'Invalid or expired OTP' })
  // Raw schema, not a DTO class: `createZodDto` cannot wrap a union
  // (TS2509). The service returns either an MFA challenge or a session.
  @ZodSerializerDto(loginWireResponseSchema)
  async verifyOtp(
    @Body() dto: VerifyOtpDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!dto.phoneNumber || !dto.otp)
      throw new BadRequestException('phoneNumber and otp are required');
    try {
      const tokens = await this.authService.verifyOtp(dto.phoneNumber, dto.otp);
      this.setAuthCookies(res, tokens);
      return stripRefreshTokenFromBody(tokens);
    } catch (error) {
      this.logger.warn(
        'Patient portal OTP verification failed',
        error instanceof Error ? error.message : 'Unknown error',
      );
      throw error;
    }
  }
}
