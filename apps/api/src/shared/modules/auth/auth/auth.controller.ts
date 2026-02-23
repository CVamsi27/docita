import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Res,
  Get,
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
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IpRateLimitGuard } from '../../shared/modules/auth/auth/guards/ip-rate-limit.guard';
import { RequestWithUser } from '../../common/types/common.types';
import { Role } from '@workspace/db';
import {
  LoginDto,
  RegisterDto,
  ChangePasswordDto,
  LoginResponseDto,
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
import { ConfigService } from '@nestjs/config';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

const ACCESS_TOKEN_MAX_AGE = 15 * 60 * 1000; // 15 minutes
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  private getCookieOptions() {
    const isProduction = this.configService.get('NODE_ENV') === 'production';
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
      maxAge: ACCESS_TOKEN_MAX_AGE,
    });
    res.cookie('refresh_token', tokens.refresh_token, {
      ...cookieOptions,
      maxAge: REFRESH_TOKEN_MAX_AGE,
      path: '/api/v1/auth', // Restrict refresh token to auth endpoints only
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
  @ApiResponse({ status: 200, description: 'Successfully logged in' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ZodSerializerDto(LoginResponseDto)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const user = await this.authService.validateUser(dto.email, dto.password);
      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }
      const tokens = await this.authService.login(user);
      this.setAuthCookies(res, tokens);
      return tokens;
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
        clinicName: dto.clinicName,
      });
      this.setAuthCookies(res, tokens);
      return tokens;
    } catch (error) {
      this.logger.error('Register error:', error);
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Roles(
    Role.ADMIN,
    Role.DOCTOR,
    Role.RECEPTIONIST,
    Role.ADMIN_DOCTOR,
    Role.SUPER_ADMIN,
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
  @Roles(
    Role.ADMIN,
    Role.DOCTOR,
    Role.RECEPTIONIST,
    Role.ADMIN_DOCTOR,
    Role.SUPER_ADMIN,
    Role.PATIENT,
  )
  @Get('validate')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Validate current session' })
  @ApiResponse({ status: 200, description: 'Session is valid' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ZodSerializerDto(ValidateSessionResponseDto)
  validate(@Request() req: AuthenticatedRequest) {
    return {
      valid: true,
      user: {
        id: req.user.userId,
        email: req.user.email,
        name: req.user.name,
        role: req.user.role,
        clinicId: req.user.clinicId,
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
    // Try DTO first, then cookie
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
}
