import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiService } from './ai.service';
import { AiFactory } from './factories/ai.factory';

@Module({
  imports: [ConfigModule],
  providers: [AiService, AiFactory],
  exports: [AiService],
})
export class AiModule {}
