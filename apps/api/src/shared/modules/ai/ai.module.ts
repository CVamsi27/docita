import { Module } from '@nestjs/common';
import { AIService } from './ai.service';
import { OpenaiService } from './openai.service';
import { OcrExtractionService } from './ocr-extraction.service';
import { ClinicalAiService } from './clinical-ai.service';
import { AskAiService } from './ask-ai.service';
import { AIController } from './ai.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { MonitoringModule } from '@/shared/modules/monitoring/monitoring/monitoring.module';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [PrismaModule, MonitoringModule, CacheModule.register()],
  controllers: [AIController],
  providers: [
    AIService,
    OpenaiService,
    OcrExtractionService,
    ClinicalAiService,
    AskAiService,
  ],
  exports: [
    AIService,
    OpenaiService,
    OcrExtractionService,
    ClinicalAiService,
    AskAiService,
  ],
})
export class AIModule {}
