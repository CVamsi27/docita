import { Module } from '@nestjs/common';
import { ConfigController } from './config.controller';
import { ConfigService } from './config.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { CLINIC_CONFIG_QUERY_PROVIDER } from './infrastructure/prisma-clinic-config.query';

@Module({
  imports: [PrismaModule],
  controllers: [ConfigController],
  providers: [ConfigService, CLINIC_CONFIG_QUERY_PROVIDER],
  exports: [ConfigService],
})
export class ConfigModule {}
