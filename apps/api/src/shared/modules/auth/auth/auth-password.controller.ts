import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Public } from './public.decorator';
import { AuthService } from './auth.service';
import { IpRateLimitGuard } from '@/shared/modules/auth/guards/ip-rate-limit.guard';
import { ChangePasswordDto, ChangePasswordResponseDto } from './dto/auth.dto';
import { ZodSerializerDto } from 'nestjs-zod';
import { AuthenticatedRequest } from '@workspace/types';
import { AuthSessionAccess } from './auth.controller.access';

@ApiTags('auth')
@Controller('auth')
export class AuthPasswordController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @UseGuards(IpRateLimitGuard)
  @Throttle({ short: { ttl: 60000, limit: 3 } })
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
  @Throttle({ short: { ttl: 60000, limit: 5 } })
  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async resetPassword(@Body() body: { token: string; newPassword: string }) {
    return this.authService.resetPassword(body.token, body.newPassword);
  }

  @AuthSessionAccess()
  @Throttle({ short: { ttl: 60000, limit: 5 } })
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
}
