import { Controller, Get, Header } from '@nestjs/common';
import { Public } from '@/shared/modules/auth/auth/public.decorator';
import { PublicDailyThoughtService } from './public-daily-thought.service';

@Controller('public')
export class PublicDailyThoughtController {
  constructor(
    private readonly publicDailyThoughtService: PublicDailyThoughtService,
  ) {}

  @Get('daily-thought')
  @Public()
  @Header(
    'Cache-Control',
    'public, s-maxage=86400, stale-while-revalidate=86400',
  )
  async getDailyThought() {
    return this.publicDailyThoughtService.getDailyThought();
  }
}
