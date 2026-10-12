import { getPatientFullName } from '@workspace/utils';
import {
  Controller,
  Post,
  Body,
  Res,
  UseGuards,
  Logger,
  Request,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { Prisma } from '@workspace/db';
import { Public } from './public.decorator';
import { AuthService } from './auth.service';
import { IpRateLimitGuard } from '@/shared/modules/auth/guards/ip-rate-limit.guard';
import {
  RegisterDto,
  RegisterResponseDto,
  CheckEmailDto,
  CheckEmailResponseDto,
} from './dto/auth.dto';
import { ZodSerializerDto } from 'nestjs-zod';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { Request as ExpressRequest } from 'express';
import { TurnstileVerifyService } from '@/shared/modules/turnstile/turnstile-verify.service';
import {
  setAuthCookies,
  stripRefreshTokenFromBody,
} from './auth-cookie.helpers';

@ApiTags('auth')
@Controller('auth')
export class AuthRegistrationController {
  private readonly logger = new Logger(AuthRegistrationController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly configService: AppConfigService,
    private readonly turnstile: TurnstileVerifyService,
  ) {}

  @Public()
  @Throttle({ short: { ttl: 60000, limit: 10 } })
  @Post('check-email')
  @ApiOperation({ summary: 'Check if email exists' })
  @ApiResponse({ status: 201, description: 'Email check result' })
  @ZodSerializerDto(CheckEmailResponseDto)
  async checkEmail(@Body() dto: CheckEmailDto) {
    const exists = await this.authService.checkEmailExists(dto.email);
    return { exists };
  }

  @Public()
  @UseGuards(IpRateLimitGuard)
  @Throttle({ short: { ttl: 60000, limit: 5 } })
  @Post('register')
  @ApiOperation({ summary: 'Register new user and clinic' })
  @ApiResponse({ status: 201, description: 'Successfully registered' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ZodSerializerDto(RegisterResponseDto)
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
    @Request() req: ExpressRequest,
  ) {
    try {
      // P5.17: fail-closed human check when TURNSTILE_SECRET_KEY is configured.
      await this.turnstile.assertValidToken(dto.turnstileToken, req.ip);
      const tokens = await this.authService.register({
        email: dto.email,
        password: dto.password,
        name: getPatientFullName(dto),
        role: dto.role,
        clinicName: dto.clinicName,
      });
      setAuthCookies(res, tokens, this.configService);
      return stripRefreshTokenFromBody(tokens);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P1000'
      ) {
        this.logger.warn(
          'Register unavailable due to database authentication failure.',
        );
      } else {
        this.logger.error('Register error:', error);
      }
      throw error;
    }
  }
}
