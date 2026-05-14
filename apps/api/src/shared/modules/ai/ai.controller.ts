import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { AIService } from './ai.service';
import { AskAiService } from './ask-ai.service';
import { Role } from '@workspace/db';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { TierGuard } from '@/shared/modules/auth/auth/tier.guard';
import {
  RequireFeature,
  Feature,
} from '@/shared/modules/auth/auth/tier.decorator';
import { RateLimit } from '@/common/interceptors/rate-limit.interceptor';
import {
  AIAnalysisResponseDto,
  DiagnosisSuggestionListResponseDto,
  DiagnosisSuggestionRequestDto,
  MedicationRecommendationListResponseDto,
  MedicationRecommendationRequestDto,
  ExtractionResultResponseDto,
  AnalyzePrescriptionDto,
  AskAiRequestDto,
} from './dto/ai.dto';
import { ZodSerializerDto } from 'nestjs-zod';
import { createTempDiskStorage } from '@/common/utils/upload.utils';
import { unlink } from 'fs/promises';

@Controller('ai')
@Roles(Role.ADMIN, Role.DOCTOR, Role.ADMIN_DOCTOR)
@UseGuards(TierGuard)
export class AIController {
  private readonly logger = new Logger(AIController.name);

  constructor(
    private readonly aiService: AIService,
    private readonly askAiService: AskAiService,
  ) {}

  @Post('ask')
  @RateLimit({ limit: 30, window: 60000 })
  @RequireFeature(Feature.AI_PRESCRIPTION_ASSISTANT)
  async ask(
    @Body() dto: AskAiRequestDto,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const controller = new AbortController();
    const cleanup = () => controller.abort();
    req.on('close', cleanup);
    req.on('aborted', cleanup);

    const send = (event: string, data: unknown) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
      for await (const delta of this.askAiService.stream({
        prompt: dto.prompt,
        history: dto.history,
        scope: dto.scope ?? null,
        signal: controller.signal,
      })) {
        if (controller.signal.aborted) break;
        send('delta', { text: delta });
      }
      send('done', { ok: true });
    } catch (err) {
      if (controller.signal.aborted) {
        send('done', { ok: true, aborted: true });
      } else {
        const message =
          err instanceof Error ? err.message : 'AI request failed';
        this.logger.error(`Ask AI stream failed: ${message}`);
        send('error', { message });
      }
    } finally {
      req.off('close', cleanup);
      req.off('aborted', cleanup);
      res.end();
    }
  }

  @Post('prescription-analysis')
  @RateLimit({ limit: 20, window: 60000 })
  @RequireFeature(Feature.AI_PRESCRIPTION_ASSISTANT)
  @ZodSerializerDto(AIAnalysisResponseDto)
  async analyzePrescription(
    @Body()
    data: AnalyzePrescriptionDto,
  ) {
    return this.aiService.analyzePrescription(data);
  }

  @Post('diagnosis-suggestions')
  @RateLimit({ limit: 20, window: 60000 })
  @RequireFeature(Feature.AI_DIAGNOSIS_HINTS)
  @ZodSerializerDto(DiagnosisSuggestionListResponseDto)
  async suggestDiagnoses(@Body() dto: DiagnosisSuggestionRequestDto) {
    return this.aiService.suggestDiagnoses(dto.symptoms, dto.findingsNotes);
  }

  @Post('medication-recommendations')
  @RateLimit({ limit: 20, window: 60000 })
  @RequireFeature(Feature.AI_PRESCRIPTION_ASSISTANT)
  @ZodSerializerDto(MedicationRecommendationListResponseDto)
  async recommendMedications(@Body() dto: MedicationRecommendationRequestDto) {
    return this.aiService.recommendMedications(
      dto.condition,
      dto.patientAge,
      dto.allergies,
    );
  }

  @Post('ocr/extract')
  @RateLimit({ limit: 10, window: 60000 })
  @RequireFeature(Feature.OCR_ADVANCED)
  @ZodSerializerDto(ExtractionResultResponseDto)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: createTempDiskStorage(),
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.match(/image\/(jpeg|jpg|png|gif|webp)/)) {
          return cb(
            new BadRequestException('Only image files are allowed!'),
            false,
          );
        }
        cb(null, true);
      },
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
  )
  async extractWithAI(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    try {
      return await this.aiService.extractFromMedicalDocument(file.path, true);
    } finally {
      if (file.path) {
        await unlink(file.path).catch(() => {});
      }
    }
  }
}
