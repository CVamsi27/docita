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
import type { Response } from 'express';
import { RequestWithUser } from '@/shared/common/types/common.types';
import { AIService } from './ai.service';
import { AskAiService } from './ask-ai.service';
import { AiCreditGuardService } from './ai-credit-guard.service';
import { Role } from '@workspace/db';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { TierGuard } from '@/shared/modules/auth/auth/tier.guard';
import {
  RequireFeature,
  Feature,
} from '@/shared/modules/auth/auth/tier.decorator';
import { RateLimit } from '@/shared/common/interceptors/rate-limit.interceptor';
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
import {
  assertAllowedFileSignature,
  createTempDiskStorage,
} from '@/shared/common/utils/upload.utils';
import { unlink } from 'fs/promises';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApplicationEvents } from '@/shared/common/events/application-events';
import type { AuthenticatedRequest, AiCreditFeature } from '@workspace/types';

@Controller('ai')
@Roles(Role.ADMIN, Role.DOCTOR, Role.ADMIN_DOCTOR)
@UseGuards(TierGuard)
export class AIController {
  private readonly logger = new Logger(AIController.name);

  constructor(
    private readonly aiService: AIService,
    private readonly askAiService: AskAiService,
    private readonly eventEmitter: EventEmitter2,
    private readonly aiCreditGuard: AiCreditGuardService,
  ) {}

  /**
   * Fire-and-forget: record a billable AI operation as usage so it feeds the
   * billing usage rollups (a billing listener consumes AI_CREDITS_CONSUMED).
   * Never throws — telemetry must not break the response. Enforcement
   * (blocking) is gated separately on AI_CREDIT_ALLOTMENT_BY_TIER.
   */
  private recordAiUsage(
    req: { user?: { clinicId?: string | null } | null },
    feature: AiCreditFeature,
  ): void {
    const clinicId = req.user?.clinicId;
    if (!clinicId) return;
    try {
      this.eventEmitter.emit(ApplicationEvents.AI_CREDITS_CONSUMED, {
        clinicId,
        feature,
      });
    } catch (err) {
      this.logger.warn(
        `Failed to emit AI usage event: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  /**
   * Meter a synchronous AI OCR extraction as AI credits (not OCR_PAGE) so the
   * single-image endpoint shares the same quota as other AI ops. Bulk import
   * OCR continues to emit OCR_PAGE_PROCESSED separately.
   */
  private recordOcrAsAiCredits(req: {
    user?: { clinicId?: string | null } | null;
  }): void {
    this.recordAiUsage(req, 'documentOcr');
  }

  @Post('ask')
  @RateLimit({ limit: 30, window: 60000 })
  @RequireFeature(Feature.AI_PRESCRIPTION_ASSISTANT)
  async ask(
    @Body() dto: AskAiRequestDto,
    @Req() req: RequestWithUser,
    @Res() res: Response,
  ): Promise<void> {
    const admission = await this.aiCreditGuard.assertWithinAllotment(
      req.user?.clinicId,
    );

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
      this.recordAiUsage(req, 'clinicalNote');
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
      await this.aiCreditGuard.releaseAdmission(admission);
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
    @Req() req: AuthenticatedRequest,
  ) {
    const admission = await this.aiCreditGuard.assertWithinAllotment(
      req.user?.clinicId,
    );
    try {
      const result = await this.aiService.analyzePrescription(data);
      this.recordAiUsage(req, 'prescriptionSuggestion');
      return result;
    } finally {
      await this.aiCreditGuard.releaseAdmission(admission);
    }
  }

  @Post('diagnosis-suggestions')
  @RateLimit({ limit: 20, window: 60000 })
  @RequireFeature(Feature.AI_DIAGNOSIS_HINTS)
  @ZodSerializerDto(DiagnosisSuggestionListResponseDto)
  async suggestDiagnoses(
    @Body() dto: DiagnosisSuggestionRequestDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const admission = await this.aiCreditGuard.assertWithinAllotment(
      req.user?.clinicId,
    );
    try {
      const result = await this.aiService.suggestDiagnoses(
        dto.symptoms,
        dto.findingsNotes,
      );
      this.recordAiUsage(req, 'codingSuggestion');
      return result;
    } finally {
      await this.aiCreditGuard.releaseAdmission(admission);
    }
  }

  @Post('medication-recommendations')
  @RateLimit({ limit: 20, window: 60000 })
  @RequireFeature(Feature.AI_PRESCRIPTION_ASSISTANT)
  @ZodSerializerDto(MedicationRecommendationListResponseDto)
  async recommendMedications(
    @Body() dto: MedicationRecommendationRequestDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const admission = await this.aiCreditGuard.assertWithinAllotment(
      req.user?.clinicId,
    );
    try {
      const result = await this.aiService.recommendMedications(
        dto.condition,
        dto.patientAge,
        dto.allergies,
      );
      this.recordAiUsage(req, 'prescriptionSuggestion');
      return result;
    } finally {
      await this.aiCreditGuard.releaseAdmission(admission);
    }
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
  async extractWithAI(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: RequestWithUser,
  ) {
    if (!file) throw new BadRequestException('File is required');

    try {
      const admission = await this.aiCreditGuard.assertWithinAllotment(
        req.user?.clinicId,
      );
      try {
        await assertAllowedFileSignature(file, ['png', 'jpeg', 'webp', 'gif'], {
          originalname: file.originalname,
          mimetype: file.mimetype,
        });
        const result = await this.aiService.extractFromMedicalDocument(
          file.path,
          true,
        );
        this.recordOcrAsAiCredits(req);
        return result;
      } finally {
        await this.aiCreditGuard.releaseAdmission(admission);
      }
    } finally {
      // Also runs when the credit guard rejects: a 402 must not leave the
      // uploaded document in the temp directory.
      if (file.path) {
        await unlink(file.path).catch(() => {});
      }
    }
  }
}
