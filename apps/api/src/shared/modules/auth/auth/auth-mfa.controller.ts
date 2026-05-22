import { Controller, Post, Body, Request } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MfaService } from './mfa.service';
import { AuthenticatedRequest } from '@workspace/types';
import { AuthSessionAccess } from './auth.controller.access';

@ApiTags('auth')
@Controller('auth')
export class AuthMfaController {
  constructor(private readonly mfaService: MfaService) {}

  @AuthSessionAccess()
  @Throttle({ short: { ttl: 60000, limit: 3 } })
  @Post('mfa/setup')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Initiate MFA setup — returns QR code' })
  async setupMfa(@Request() req: AuthenticatedRequest) {
    return this.mfaService.generateSetupSecret(req.user.sub);
  }

  @AuthSessionAccess()
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

  @AuthSessionAccess()
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

  @AuthSessionAccess()
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
}
