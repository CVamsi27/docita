import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { AppConfigService } from './shared/modules/config/app-configuration.service';

import { Public } from './shared/modules/auth/auth/public.decorator';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly configService: AppConfigService,
  ) {}

  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Public()
  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: this.configService.getAppVersion(),
    };
  }
}
