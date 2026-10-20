import { Controller, Post, Body, Request } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ZodSerializerDto } from 'nestjs-zod';
import { MfaService } from './mfa.service';
import { AuthenticatedRequest } from '@workspace/types';
import { AuthSessionAccess } from './auth.controller.access';
import {
  LogoutResponseDto,
  MfaBackupCodesResponseDto,
  MfaCodeDto,
  MfaSetupResponseDto,
} from './dto/auth.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthMfaController {
  constructor(private readonly mfaService: MfaService) {}

  @AuthSessionAccess()
  @Throttle({ short: { ttl: 60000, limit: 3 } })
  @Post('mfa/setup')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Initiate MFA setup — returns QR code' })
  @ZodSerializerDto(MfaSetupResponseDto)
  async setupMfa(@Request() req: AuthenticatedRequest) {
    return this.mfaService.generateSetupSecret(req.user.sub);
  }

  @AuthSessionAccess()
  @Throttle({ short: { ttl: 60000, limit: 5 } })
  @Post('mfa/enable')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Confirm TOTP code to activate MFA' })
  @ZodSerializerDto(MfaBackupCodesResponseDto)
  async enableMfa(
    @Request() req: AuthenticatedRequest,
    @Body() dto: MfaCodeDto,
  ) {
    return this.mfaService.enableMfa(req.user.sub, dto.code);
  }

  @AuthSessionAccess()
  @Throttle({ short: { ttl: 60000, limit: 5 } })
  @Post('mfa/disable')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Disable MFA (requires valid TOTP code)' })
  @ZodSerializerDto(LogoutResponseDto)
  async disableMfa(
    @Request() req: AuthenticatedRequest,
    @Body() dto: MfaCodeDto,
  ) {
    await this.mfaService.disableMfa(req.user.sub, dto.code);
    return { message: 'MFA disabled successfully' };
  }

  @AuthSessionAccess()
  @Throttle({ short: { ttl: 60000, limit: 3 } })
  @Post('mfa/backup-codes')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Regenerate MFA backup codes' })
  @ZodSerializerDto(MfaBackupCodesResponseDto)
  async regenerateBackupCodes(
    @Request() req: AuthenticatedRequest,
    @Body() dto: MfaCodeDto,
  ) {
    return this.mfaService.regenerateBackupCodes(req.user.sub, dto.code);
  }
}
