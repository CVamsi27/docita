import { Body, Controller, Post, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ZodSerializerDto } from 'nestjs-zod';
import { Response } from 'express';
import { tokenIssueResponseSchema } from '@workspace/types';
import { Public } from '@/shared/modules/auth/auth/public.decorator';
import { labPortalLoginSchema } from '@/domains/lab-portal/application/dto/lab-portal-auth.dto';
import { LabPortalAuthCommandService } from '@/domains/lab-portal/application/services/lab-portal-auth.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import {
  setAuthCookies,
  stripRefreshTokenFromBody,
} from '@/shared/modules/auth/auth/auth-cookie.helpers';

@Controller('lab-portal/auth')
export class LabPortalAuthController {
  constructor(
    private readonly labPortalAuthCommandService: LabPortalAuthCommandService,
    private readonly configService: AppConfigService,
  ) {}

  @Public()
  @Throttle({ short: { ttl: 60000, limit: 5 } })
  @Post('login')
  @ZodSerializerDto(tokenIssueResponseSchema)
  async login(
    @Body() body: unknown,
    @Res({ passthrough: true }) response: Response,
  ) {
    const dto = labPortalLoginSchema.parse(body);
    const result = await this.labPortalAuthCommandService.login(dto);

    setAuthCookies(
      response,
      {
        access_token: result.access_token,
        refresh_token: result.refresh_token,
      },
      this.configService,
    );

    // The refresh token must live only in the httpOnly cookie set above.
    // Returning the service result verbatim put it in the JSON body too,
    // where any script on the portal origin can read it — the exact
    // exposure httpOnly exists to prevent, and the reason every other
    // auth route runs its result through this helper.
    return stripRefreshTokenFromBody(result);
  }
}
