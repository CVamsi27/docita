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

/**
 * Facade service for AI operations.
 * Delegates to specialized services for OCR and Clinical AI.
 */
@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);

  constructor(
    private readonly ocrService: OcrExtractionService,
    private readonly clinicalService: ClinicalAiService,
  ) {}

  /**
   * Extract text and structured data from medical document
   */
  async extractFromMedicalDocument(
    imagePath: string,
    hasAiSubscription: boolean = false,
  ): Promise<OcrExtractionResult> {
    return this.ocrService.extractFromMedicalDocument(
      imagePath,
      hasAiSubscription,
    );
  }

  /**
   * Analyze prescription for drug interactions and contraindications
   */
  async analyzePrescription(
    request: PrescriptionAnalysisRequest,
  ): Promise<PrescriptionAnalysisResponse> {
    return this.clinicalService.analyzePrescription(request);
  }

  /**
   * Suggest diagnoses based on symptoms
   */
  async suggestDiagnoses(
    symptoms: string[],
    findingsNotes?: string,
  ): Promise<DiagnosisSuggestion[]> {
    return this.clinicalService.suggestDiagnoses(symptoms, findingsNotes);
  }

  /**
   * Recommend medications based on condition
   */
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
