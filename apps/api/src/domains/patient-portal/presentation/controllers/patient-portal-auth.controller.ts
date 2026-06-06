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
import { Response } from 'express';
import { Public } from '@/shared/modules/auth/auth/public.decorator';
import { PatientPortalAuthService } from '@/domains/patient-portal/application/services/patient-portal-auth.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { AUTH_CONSTANTS } from '@/shared/modules/config/app-constants';
import { stripRefreshTokenFromBody } from '@/shared/modules/auth/auth/auth-cookie.helpers';

class RequestOtpDto {
  phoneNumber!: string;
}

class VerifyOtpDto {
  phoneNumber!: string;
  otp!: string;
}

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
  @Throttle({
    short: {
      ttl: 60000,
      limit: 5,
    },
  })
  @Post('request-otp')
  @ApiOperation({ summary: 'Request OTP for patient portal login' })
  @ApiResponse({ status: 200, description: 'OTP sent if account exists' })
  async requestOtp(@Body() dto: RequestOtpDto) {
    if (!dto.phoneNumber)
      throw new BadRequestException('phoneNumber is required');
    return this.authService.requestOtp(dto.phoneNumber);
  }

  @Public()
  @Throttle({
    short: {
      ttl: 60000,
      limit: 5,
    },
  })
  @Post('verify-otp')
  @ApiOperation({ summary: 'Verify OTP and log in to patient portal' })
  @ApiResponse({ status: 200, description: 'Successfully logged in' })
  @ApiResponse({ status: 401, description: 'Invalid or expired OTP' })
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
