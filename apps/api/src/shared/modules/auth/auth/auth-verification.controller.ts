// jscpd:ignore-start
import { Controller, Post, Body, Request } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Public } from './public.decorator';
import { AuthService } from './auth.service';
import { AuthenticatedRequest } from '@workspace/types';
import { AuthSessionAccess } from './auth.controller.access';

@ApiTags('auth')
// jscpd:ignore-end
@Controller('auth')
export class AuthVerificationController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ short: { ttl: 60000, limit: 5 } })
  @Post('verify-email')
  @ApiOperation({ summary: 'Verify email address with token' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async verifyEmail(@Body() body: { token: string }) {
    return this.authService.verifyEmail(body.token);
  }

  @AuthSessionAccess()
  @Throttle({ short: { ttl: 60000, limit: 3 } })
  @Post('resend-verification')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Resend email verification link' })
  @ApiResponse({ status: 200, description: 'Verification email sent' })
  async resendVerification(@Request() req: AuthenticatedRequest) {
    return this.authService.sendVerificationEmail(req.user.sub);
  }
}
