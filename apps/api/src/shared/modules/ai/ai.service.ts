import { Injectable, Logger } from '@nestjs/common';
import { OcrExtractionService } from './ocr-extraction.service';
import { ClinicalAiService } from './clinical-ai.service';
import {
  PrescriptionAnalysisRequest,
  PrescriptionAnalysisResponse,
  DiagnosisSuggestion,
  MedicationRecommendation,
  OcrExtractionResult,
} from '@workspace/types';

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);

  constructor(
    private readonly ocrService: OcrExtractionService,
    private readonly clinicalService: ClinicalAiService,
  ) {}

  async extractFromMedicalDocument(
    imagePath: string,
    hasAiSubscription: boolean = false,
  ): Promise<OcrExtractionResult> {
    return this.ocrService.extractFromMedicalDocument(
      imagePath,
      hasAiSubscription,
    );
  }

  async analyzePrescription(
    request: PrescriptionAnalysisRequest,
  ): Promise<PrescriptionAnalysisResponse> {
    return this.clinicalService.analyzePrescription(request);
  }

  async suggestDiagnoses(
    symptoms: string[],
    findingsNotes?: string,
  ): Promise<DiagnosisSuggestion[]> {
    return this.clinicalService.suggestDiagnoses(symptoms, findingsNotes);
  }

  async recommendMedications(
    condition: string,
    patientAge?: number,
    allergies?: string[],
  ): Promise<MedicationRecommendation[]> {
    return this.clinicalService.recommendMedications(
      condition,
      patientAge,
      allergies,
    );
  }
}
