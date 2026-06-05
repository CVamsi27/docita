import { Body, Controller, Post, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { Public } from '@/shared/modules/auth/auth/public.decorator';
import { labPortalLoginSchema } from '@/domains/lab-portal/application/dto/lab-portal-auth.dto';
import { LabPortalAuthService } from '@/domains/lab-portal/application/services/lab-portal-auth.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import {
  setAuthCookies,
} from '@/shared/modules/auth/auth/auth-cookie.helpers';

@Controller('lab-portal/auth')
export class LabPortalAuthController {
  constructor(
    private readonly labPortalAuthService: LabPortalAuthService,
    private readonly configService: AppConfigService,
  ) {}

  @Public()
  @Throttle({ short: { ttl: 60000, limit: 5 } })
  @Post('login')
  async login(
    @Body() body: unknown,
    @Res({ passthrough: true }) response: Response,
  ) {
    const dto = labPortalLoginSchema.parse(body);
    const result = await this.labPortalAuthService.login(dto);

    setAuthCookies(response, {
      access_token: result.access_token,
      refresh_token: result.refresh_token,
    }, this.configService);

    return result;
  }
}
