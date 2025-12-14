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
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { TierGuard } from '../../auth/tier.guard';
import { RequireFeature, Feature } from '../../auth/tier.decorator';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('ai')
@UseGuards(JwtAuthGuard, TierGuard)
export class AIController {
  constructor(private readonly aiService: AIService) {}

  @Post('prescription-analysis')
  async analyzePrescription(
    @Body()
    data: {
      medications: Array<{ name: string; dosage: string }>;
      patientAge?: number;
      patientAllergies?: string[];
      existingConditions?: string[];
    },
  ) {
    return this.aiService.analyzePrescription(data);
  }

  @Post('diagnosis-suggestions')
  async suggestDiagnoses(
    @Body() data: { symptoms: string[]; findingsNotes?: string },
  ) {
    return this.aiService.suggestDiagnoses(data.symptoms, data.findingsNotes);
  }

  @Post('medication-recommendations')
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
