import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Request,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@workspace/db';
import { Roles } from './roles.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ApiKeyService } from './api-key.service';
import { AuthenticatedRequest } from '@workspace/types';

@ApiTags('auth')
@Controller('auth')
export class AuthApiKeysController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

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
