import { Module } from '@nestjs/common';
import { ConfigController } from './config.controller';
import { ConfigService } from './config.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ConfigController],
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigModule {}
