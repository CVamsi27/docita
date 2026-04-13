import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Res,
  Get,
  Delete,
  Param,
  UnauthorizedException,
  BadRequestException,
  UsePipes,
  Logger,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Response } from 'express';
import { Public } from './public.decorator';
import { Roles } from './roles.decorator';
import { AllowNoClinic } from './allow-no-clinic.decorator';
import { AuthService } from './auth.service';
import { MfaService } from './mfa.service';
import { ApiKeyService } from './api-key.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IpRateLimitGuard } from '@/shared/modules/auth/guards/ip-rate-limit.guard';
import { SkipSubscriptionCheck } from '@/shared/modules/auth/decorators/skip-subscription-check.decorator';
import { SkipPasswordExpiry } from '@/shared/modules/auth/guards/password-expired.guard';
import { SkipEmailVerification } from '@/shared/modules/auth/guards/email-verified.guard';
import { RequestWithUser } from '@/common/types/common.types';
import { Prisma, Role } from '@workspace/db';
import {
  LoginDto,
  RegisterDto,
  ChangePasswordDto,
  RegisterResponseDto,
  ValidateSessionResponseDto,
  ChangePasswordResponseDto,
  CheckEmailDto,
  CheckEmailResponseDto,
  RefreshTokenDto,
  LogoutRequestDto,
  RefreshTokenSchema,
  LogoutSchema,
} from './dto/auth.dto';
import { ZodSerializerDto } from 'nestjs-zod';
import { AuthenticatedRequest } from '@workspace/types';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import { AUTH_CONSTANTS } from '@/shared/modules/config/app-constants';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private authService: AuthService,
    private mfaService: MfaService,
    private apiKeyService: ApiKeyService,
    private configService: AppConfigService,
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

  private clearAuthCookies(res: Response) {
    const cookieOptions = this.getCookieOptions();
    res.clearCookie('access_token', cookieOptions);
    res.clearCookie('refresh_token', {
      ...cookieOptions,
      path: '/api/v1/auth',
    });
  }

  @Public()
  @Throttle({
    short: {
      ttl: 60000,
      limit: 10,
    },
  })
  @Post('check-email')
  @ApiOperation({ summary: 'Check if email exists' })
  @ApiResponse({ status: 200, description: 'Email check result' })
  @ZodSerializerDto(CheckEmailResponseDto)
  async checkEmail(@Body() dto: CheckEmailDto) {
    const exists = await this.authService.checkEmailExists(dto.email);
    return { exists };
  }

  @Public()
  @UseGuards(IpRateLimitGuard)
  @Throttle({
    short: {
      ttl: 60000,
      limit: 5,
    },
  })
  @Post('login')
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({
    status: 200,
    description: 'Successfully logged in or MFA challenge issued',
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() dto: LoginDto,
    @Request() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const user = await this.authService.validateUser(dto.email, dto.password);
      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }
      const result = await this.authService.loginWithMfaCheck(user);
      if ('mfa_required' in result) {
        return result;
      }
      this.setAuthCookies(res, result);
      return result;
    } catch (error) {
      this.logger.error('Login error:', error);
      throw error;
    }
  }

  @Public()
  @UseGuards(IpRateLimitGuard)
  @Throttle({
    short: {
      ttl: 60000,
      limit: 5,
    },
  })
  @Post('register')
  @ApiOperation({ summary: 'Register new user and clinic' })
  @ApiResponse({ status: 201, description: 'Successfully registered' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ZodSerializerDto(RegisterResponseDto)
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const tokens = await this.authService.register({
        email: dto.email,
        password: dto.password,
        name: `${dto.firstName} ${dto.lastName}`,
        role: dto.role,
        clinicName: dto.clinicName,
      });
      this.setAuthCookies(res, tokens);
      return tokens;
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

  @Public()
  @UseGuards(IpRateLimitGuard)
  @Throttle({
    short: {
      ttl: 60000,
      limit: 3,
    },
  })
  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({
    status: 200,
    description: 'Reset link sent if account exists',
  })
  async forgotPassword(@Body() body: { email: string }) {
    return this.authService.requestPasswordReset(body.email);
  }

  @Public()
  @UseGuards(IpRateLimitGuard)
  @Throttle({
    short: {
      ttl: 60000,
      limit: 5,
    },
  })
  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async resetPassword(@Body() body: { token: string; newPassword: string }) {
    return this.authService.resetPassword(body.token, body.newPassword);
  }

  @UseGuards(JwtAuthGuard)
  @AllowNoClinic()
  @SkipSubscriptionCheck()
  @SkipPasswordExpiry()
  @SkipEmailVerification()
  @Roles(
    Role.ADMIN,
    Role.DOCTOR,
    Role.RECEPTIONIST,
    Role.ADMIN_DOCTOR,
    Role.INTERNAL,
    Role.PATIENT,
  )
  @Throttle({
    short: {
      ttl: 60000,
      limit: 5,
    },
  })
  @Post('change-password')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Change user password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ZodSerializerDto(ChangePasswordResponseDto)
  async changePassword(
    @Request() req: AuthenticatedRequest,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword({
      userId: req.user.sub,
      currentPassword: dto.currentPassword,
      newPassword: dto.newPassword,
    });
  }

  @UseGuards(JwtAuthGuard)
  @AllowNoClinic()
  @SkipSubscriptionCheck()
  @SkipPasswordExpiry()
  @SkipEmailVerification()
  @Roles(
    Role.ADMIN,
    Role.DOCTOR,
    Role.RECEPTIONIST,
    Role.ADMIN_DOCTOR,
    Role.INTERNAL,
    Role.PATIENT,
  )
  @Get('validate')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Validate current session' })
  @ApiResponse({ status: 200, description: 'Session is valid' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ZodSerializerDto(ValidateSessionResponseDto)
  validate(@Request() req: AuthenticatedRequest) {
    const emailVerified =
      'emailVerified' in req.user ? req.user.emailVerified : undefined;

    return {
      valid: true,
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        role: req.user.role,
        clinicId: req.user.clinicId,
        emailVerified,
        onboardingStep: req.user.onboardingStep,
      },
    };
  }

  @Public()
  @Throttle({
    short: {
      ttl: 60000,
      limit: 10,
    },
  })
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiResponse({ status: 200, description: 'Tokens rotated successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  @UsePipes(new ZodValidationPipe(RefreshTokenSchema))
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Request() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = dto.refresh_token || req.cookies?.refresh_token;
    if (!refreshToken) {
      throw new BadRequestException('refresh_token is required');
    }
    const tokens = await this.authService.refreshTokens(refreshToken);
    this.setAuthCookies(res, tokens);
    return tokens;
  }

  @Public()
  @Throttle({
    short: {
      ttl: 60000,
      limit: 20,
    },
  })
  @Post('logout')
  @ApiOperation({ summary: 'Logout and revoke refresh token' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  @UsePipes(new ZodValidationPipe(LogoutSchema))
  async logoutUser(
    @Body() dto: LogoutRequestDto,
    @Request() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = dto.refresh_token || req.cookies?.refresh_token;
    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }
    this.clearAuthCookies(res);
    return { message: 'Logged out successfully' };
  }

  @Public()
  @UseGuards(IpRateLimitGuard)
  @Throttle({ short: { ttl: 60000, limit: 5 } })
  @Post('mfa/verify')
  @ApiOperation({ summary: 'Complete MFA step after password login' })
  @ApiResponse({ status: 200, description: 'MFA verified, tokens issued' })
  async verifyMfa(
    @Body() body: { mfa_challenge_token: string; code: string },
    @Request() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const deviceInfo = {
      ipAddress: req.ip,
      userAgent: req.headers?.['user-agent'] as string | undefined,
    };
    const tokens = await this.authService.loginAfterMfa(
      body.mfa_challenge_token,
      body.code,
      deviceInfo,
    );
    this.setAuthCookies(res, tokens);
    return tokens;
  }

  @UseGuards(JwtAuthGuard)
  @AllowNoClinic()
  @SkipSubscriptionCheck()
  @SkipPasswordExpiry()
  @SkipEmailVerification()
  @Throttle({ short: { ttl: 60000, limit: 3 } })
  @Post('mfa/setup')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Initiate MFA setup — returns QR code' })
  async setupMfa(@Request() req: AuthenticatedRequest) {
    return this.mfaService.generateSetupSecret(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @AllowNoClinic()
  @SkipSubscriptionCheck()
  @SkipPasswordExpiry()
  @SkipEmailVerification()
  @Throttle({ short: { ttl: 60000, limit: 5 } })
  @Post('mfa/enable')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Confirm TOTP code to activate MFA' })
  async enableMfa(
    @Request() req: AuthenticatedRequest,
    @Body() body: { code: string },
  ) {
    return this.mfaService.enableMfa(req.user.sub, body.code);
  }

  @UseGuards(JwtAuthGuard)
  @AllowNoClinic()
  @SkipSubscriptionCheck()
  @SkipPasswordExpiry()
  @SkipEmailVerification()
  @Throttle({ short: { ttl: 60000, limit: 5 } })
  @Post('mfa/disable')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Disable MFA (requires valid TOTP code)' })
  async disableMfa(
    @Request() req: AuthenticatedRequest,
    @Body() body: { code: string },
  ) {
    await this.mfaService.disableMfa(req.user.sub, body.code);
    return { message: 'MFA disabled successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @AllowNoClinic()
  @SkipSubscriptionCheck()
  @SkipPasswordExpiry()
  @SkipEmailVerification()
  @Throttle({ short: { ttl: 60000, limit: 3 } })
  @Post('mfa/backup-codes')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Regenerate MFA backup codes' })
  async regenerateBackupCodes(
    @Request() req: AuthenticatedRequest,
    @Body() body: { code: string },
  ) {
    return this.mfaService.regenerateBackupCodes(req.user.sub, body.code);
  }

  @UseGuards(JwtAuthGuard)
  @AllowNoClinic()
  @SkipSubscriptionCheck()
  @SkipPasswordExpiry()
  @SkipEmailVerification()
  @Get('sessions')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'List all active sessions for current user' })
  async getSessions(@Request() req: AuthenticatedRequest) {
    return this.authService.getSessions(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @AllowNoClinic()
  @SkipSubscriptionCheck()
  @SkipPasswordExpiry()
  @SkipEmailVerification()
  @Delete('sessions/:id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Revoke a specific session' })
  async revokeSession(
    @Request() req: AuthenticatedRequest,
    @Param('id') sessionId: string,
  ) {
    await this.authService.revokeSession(sessionId, req.user.sub);
    return { message: 'Session revoked successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @AllowNoClinic()
  @SkipSubscriptionCheck()
  @SkipPasswordExpiry()
  @SkipEmailVerification()
  @Delete('sessions')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Revoke all sessions except current' })
  async revokeAllSessions(
    @Request()
    req: AuthenticatedRequest & {
      cookies?: { refresh_token?: string };
    },
  ) {
    const currentRefreshToken = req.cookies?.refresh_token;
    await this.authService.revokeAllSessions(req.user.sub, currentRefreshToken);
    return { message: 'All other sessions revoked' };
  }

  @Public()
  @Throttle({ short: { ttl: 60000, limit: 5 } })
  @Post('verify-email')
  @ApiOperation({ summary: 'Verify email address with token' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async verifyEmail(@Body() body: { token: string }) {
    return this.authService.verifyEmail(body.token);
  }

  @UseGuards(JwtAuthGuard)
  @AllowNoClinic()
  @SkipSubscriptionCheck()
  @SkipPasswordExpiry()
  @SkipEmailVerification()
  @Throttle({ short: { ttl: 60000, limit: 3 } })
  @Post('resend-verification')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Resend email verification link' })
  @ApiResponse({ status: 200, description: 'Verification email sent' })
  async resendVerification(@Request() req: AuthenticatedRequest) {
    return this.authService.sendVerificationEmail(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN, Role.ADMIN_DOCTOR, Role.INTERNAL)
  @Throttle({ short: { ttl: 60000, limit: 10 } })
  @Post('api-keys')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new API key for the clinic' })
  async createApiKey(
    @Request() req: AuthenticatedRequest,
    @Body() body: { name: string; scopes: string[]; expiresAt?: string },
  ) {
    if (!req.user.clinicId) {
      throw new BadRequestException('No clinic associated with this account');
    }
    let expiresAt: Date | undefined;
    if (body.expiresAt) {
      const parsed = new Date(body.expiresAt);
      if (isNaN(parsed.getTime())) {
        throw new BadRequestException(
          'expiresAt must be a valid ISO date string',
        );
      }
      expiresAt = parsed;
    }

    return this.apiKeyService.createApiKey(req.user.clinicId, req.user.sub, {
      name: body.name,
      scopes: body.scopes,
      expiresAt,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN, Role.ADMIN_DOCTOR, Role.INTERNAL)
  @Get('api-keys')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'List all API keys for the clinic' })
  async listApiKeys(@Request() req: AuthenticatedRequest) {
    if (!req.user.clinicId) {
      throw new BadRequestException('No clinic associated with this account');
    }
    return this.apiKeyService.listApiKeys(req.user.clinicId);
  }

  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN, Role.ADMIN_DOCTOR, Role.INTERNAL)
  @Delete('api-keys/:id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Revoke an API key' })
  async revokeApiKey(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    if (!req.user.clinicId) {
      throw new BadRequestException('No clinic associated with this account');
    }
    await this.apiKeyService.revokeApiKey(id, req.user.clinicId);
    return { message: 'API key revoked successfully' };
  }
}
