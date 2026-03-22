import { Module } from '@nestjs/common';
import { PublicStatsController } from './public-stats.controller';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PublicStatsController],
})
export class PublicModule {}
