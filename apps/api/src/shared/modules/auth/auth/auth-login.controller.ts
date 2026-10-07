import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Res,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ZodSerializerDto } from 'nestjs-zod';
import { Response } from 'express';
import { loginWireResponseSchema } from '@workspace/types';
import { Public } from './public.decorator';
import { AuthService } from './auth.service';
import { IpRateLimitGuard } from '@/shared/modules/auth/guards/ip-rate-limit.guard';
import { RequestWithUser } from '@/shared/common/types/common.types';
import { LoginDto, MfaVerifyDto, TokenIssueResponseDto } from './dto/auth.dto';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import {
  setAuthCookies,
  stripRefreshTokenFromBody,
} from './auth-cookie.helpers';
import { readRequestHeaderString } from '@/shared/common/http/request-headers';
import { TurnstileVerifyService } from '@/shared/modules/turnstile/turnstile-verify.service';

@ApiTags('auth')
@Controller('auth')
export class AuthLoginController {
  private readonly logger = new Logger(AuthLoginController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly configService: AppConfigService,
    private readonly turnstile: TurnstileVerifyService,
  ) {}

  @Public()
  @UseGuards(IpRateLimitGuard)
  @Throttle({ short: { ttl: 60000, limit: 5 } })
  @Post('login')
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({
    status: 200,
    description: 'Successfully logged in or MFA challenge issued',
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  // Passed as a raw schema, not a DTO class: `createZodDto` cannot wrap a
  // discriminated union (TS2509), and the interceptor resolves a bare schema.
  @ZodSerializerDto(loginWireResponseSchema)
  async login(
    @Body() dto: LoginDto,
    @Request() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      // P5.17: fail-closed human check when TURNSTILE_SECRET_KEY is configured;
      // no-op otherwise so local dev / non-browser clients keep working.
      await this.turnstile.assertValidToken(dto.turnstileToken, req.ip);
      const user = await this.authService.validateUser(dto.email, dto.password);
      if (!user) throw new UnauthorizedException('Invalid credentials');
      const result = await this.authService.loginWithMfaCheck(user);
      if ('mfa_required' in result) return result;
      setAuthCookies(res, result, this.configService);
      return stripRefreshTokenFromBody(result);
    } catch (error) {
      this.logger.error('Login error:', error);
      throw error;
    }
  }

  @Public()
  @UseGuards(IpRateLimitGuard)
  @Throttle({ short: { ttl: 60000, limit: 5 } })
  @Post('mfa/verify')
  @ApiOperation({ summary: 'Complete MFA step after password login' })
  @ApiResponse({ status: 200, description: 'MFA verified, tokens issued' })
  @ZodSerializerDto(TokenIssueResponseDto)
  async verifyMfa(
    @Body() dto: MfaVerifyDto,
    @Request() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const deviceInfo = {
      ipAddress: req.ip,
      userAgent: readRequestHeaderString(req.headers, 'user-agent'),
    };
    const tokens = await this.authService.loginAfterMfa(
      dto.mfa_challenge_token,
      dto.code,
      deviceInfo,
    );
    setAuthCookies(res, tokens, this.configService);
    return stripRefreshTokenFromBody(tokens);
  }
}
