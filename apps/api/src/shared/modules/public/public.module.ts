import { Module } from '@nestjs/common';
import { PublicStatsController } from './public-stats.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { PublicStatsService } from './public-stats.service';

@Module({
  imports: [PrismaModule],
  controllers: [PublicStatsController],
  providers: [PublicStatsService],
})
export class PublicModule {}
