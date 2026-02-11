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
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
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
} from './dto/auth.dto';
import { ZodSerializerDto } from 'nestjs-zod';
import { AuthenticatedRequest } from '@workspace/types';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: IS_PRODUCTION,
  sameSite: 'strict' as const,
  path: '/',
};
const ACCESS_TOKEN_MAX_AGE = 15 * 60 * 1000; // 15 minutes
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  private setAuthCookies(
    res: Response,
    tokens: { access_token: string; refresh_token: string },
  ) {
    res.cookie('access_token', tokens.access_token, {
      ...COOKIE_OPTIONS,
      maxAge: ACCESS_TOKEN_MAX_AGE,
    });
    res.cookie('refresh_token', tokens.refresh_token, {
      ...COOKIE_OPTIONS,
      maxAge: REFRESH_TOKEN_MAX_AGE,
      path: '/api/v1/auth', // Restrict refresh token to auth endpoints only
    });
  }

  private clearAuthCookies(res: Response) {
    res.clearCookie('access_token', COOKIE_OPTIONS);
    res.clearCookie('refresh_token', {
      ...COOKIE_OPTIONS,
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
      console.error('Login error:', error);
      throw error;
    }
  }

  @Public()
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
      console.error('Register error:', error);
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard)
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
  async refresh(
    @Body() body: { refresh_token?: string },
    @Request() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Try body first, then cookie
    const refreshToken = body.refresh_token || req.cookies?.refresh_token;
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
  async logoutUser(
    @Body() body: { refresh_token?: string },
    @Request() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = body.refresh_token || req.cookies?.refresh_token;
    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }
    this.clearAuthCookies(res);
    return { message: 'Logged out successfully' };
  }
}
