import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AIService } from './ai.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@Controller('ai')
@UseGuards(JwtAuthGuard)
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
}
