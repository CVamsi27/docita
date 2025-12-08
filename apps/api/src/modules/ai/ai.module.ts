import { Module } from '@nestjs/common';
import { AIService } from './ai.service';
import { AIController } from './ai.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { MonitoringModule } from '../../monitoring/monitoring.module';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [PrismaModule, MonitoringModule, CacheModule.register()],
  controllers: [AIController],
  providers: [AIService],
  exports: [AIService],
})
export class AIModule {}
