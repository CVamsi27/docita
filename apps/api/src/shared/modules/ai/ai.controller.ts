import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req as _Req,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AIService } from './ai.service';
import { Role } from '@workspace/db';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { TierGuard } from '@/shared/modules/auth/auth/tier.guard';
import {
  RequireFeature,
  Feature,
} from '@/shared/modules/auth/auth/tier.decorator';
import { RateLimit } from '@/common/interceptors/rate-limit.interceptor';
import { diskStorage } from 'multer';
import { extname } from 'path';
import {
  AIAnalysisResponseDto,
  DiagnosisSuggestionListResponseDto,
  DiagnosisSuggestionRequestDto,
  MedicationRecommendationListResponseDto,
  MedicationRecommendationRequestDto,
  ExtractionResultResponseDto,
  AnalyzePrescriptionDto,
} from './dto/ai.dto';
import { ZodSerializerDto } from 'nestjs-zod';

@Controller('ai')
@Roles(Role.ADMIN, Role.DOCTOR, Role.ADMIN_DOCTOR)
@UseGuards(TierGuard)
export class AIController {
  constructor(private readonly aiService: AIService) {}

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
      storage: diskStorage({
        destination: './uploads/temp',
        filename: (_req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
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

    return this.aiService.extractFromMedicalDocument(file.path, true);
  }
}
