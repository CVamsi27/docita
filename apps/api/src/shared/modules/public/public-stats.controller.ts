import { Controller, Get } from '@nestjs/common';
import { Public } from '@/shared/modules/auth/auth/public.decorator';
import { PublicStatsService } from './public-stats.service';

@Controller('public')
export class PublicStatsController {
  constructor(private readonly publicStatsService: PublicStatsService) {}

  @Get('platform-stats')
  @Public()
  async getPlatformStats() {
    return this.publicStatsService.getPlatformStats();
  }
}
