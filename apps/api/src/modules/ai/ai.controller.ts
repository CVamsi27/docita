import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AIService } from './ai.service';
import { Role } from '@workspace/db';
import { Roles } from '../auth/roles.decorator';
import { TierGuard } from '../auth/tier.guard';
import { RequireFeature, Feature } from '../auth/tier.decorator';
import { diskStorage } from 'multer';
import { extname } from 'path';
import {
  AIAnalysisResponseDto,
  DiagnosisSuggestionListResponseDto,
  MedicationRecommendationListResponseDto,
  ExtractionResultResponseDto,
  AnalyzePrescriptionDto,
} from './dto/ai.dto';
import { ZodSerializerDto } from 'nestjs-zod';

@Controller('ai')
@Roles(Role.ADMIN, Role.DOCTOR, Role.ADMIN_DOCTOR, Role.SUPER_ADMIN)
@UseGuards(TierGuard)
export class AIController {
  constructor(private readonly aiService: AIService) {}

  @Post('prescription-analysis')
  @ZodSerializerDto(AIAnalysisResponseDto)
  async analyzePrescription(
    @Body()
    data: AnalyzePrescriptionDto,
  ) {
    return this.aiService.analyzePrescription(data);
  }

  @Post('diagnosis-suggestions')
  @ZodSerializerDto(DiagnosisSuggestionListResponseDto)
  async suggestDiagnoses(
    @Body() data: { symptoms: string[]; findingsNotes?: string },
  ) {
    return this.aiService.suggestDiagnoses(data.symptoms, data.findingsNotes);
  }

  @Post('medication-recommendations')
  @ZodSerializerDto(MedicationRecommendationListResponseDto)
  async recommendMedications(
    @Body()
    data: {
      condition: string;
      patientAge?: number;
      allergies?: string[];
    },
  ) {
    return this.aiService.recommendMedications(
      data.condition,
      data.patientAge,
      data.allergies,
    );
  }

  @Post('ocr/extract')
  @RequireFeature(Feature.OCR_ADVANCED)
  @ZodSerializerDto(ExtractionResultResponseDto)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/temp',
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
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
