import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Request,
  Res,
  BadRequestException,
  UsePipes,
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
import { RequestWithUser } from '@/shared/common/types/common.types';
import {
  ValidateSessionResponseDto,
  RefreshTokenDto,
  LogoutRequestDto,
  RefreshTokenSchema,
  LogoutSchema,
} from './dto/auth.dto';
import { ZodSerializerDto } from 'nestjs-zod';
import { AuthenticatedRequest } from '@workspace/types';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { ZodValidationPipe } from '@/shared/common/pipes/zod-validation.pipe';
import { AuthSessionAccess } from './auth.controller.access';
import {
  setAuthCookies,
  clearAuthCookies,
  stripRefreshTokenFromBody,
} from './auth-cookie.helpers';

@ApiTags('auth')
@Controller('auth')
export class AuthSessionController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: AppConfigService,
  ) {}

  @AuthSessionAccess()
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
  @Throttle({ short: { ttl: 60000, limit: 10 } })
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
    setAuthCookies(res, tokens, this.configService);
    return stripRefreshTokenFromBody(tokens);
  }

  @Public()
  @Throttle({ short: { ttl: 60000, limit: 20 } })
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
    clearAuthCookies(res, this.configService);
    return { message: 'Logged out successfully' };
  }

  @AuthSessionAccess()
  @Get('sessions')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'List all active sessions for current user' })
  async getSessions(@Request() req: AuthenticatedRequest) {
    return this.authService.getSessions(req.user.sub);
  }

  @AuthSessionAccess()
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

  @AuthSessionAccess()
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
}
