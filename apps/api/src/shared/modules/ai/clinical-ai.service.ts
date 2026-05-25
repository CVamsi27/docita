import { Injectable, Logger } from '@nestjs/common';
import { OpenaiService } from './openai.service';
import {
  PrescriptionAnalysisRequest,
  PrescriptionAnalysisResponse,
  DiagnosisSuggestion,
  MedicationRecommendation,
} from '@workspace/types';
import { isRecord } from '@workspace/utils';
import { normalizePrescriptionAnalysis } from '@/shared/modules/ai/clinical-ai-normalizers';

interface RawDiagnosisSuggestion {
  icdCode?: string;
  diagnosis?: string;
  condition?: string;
  confidence?: number;
  description?: string;
}

interface RawMedicationRecommendation {
  medicationName?: string;
  strength?: string;
  frequency?: string;
  indication?: string;
  confidence?: number;
}

@Injectable()
export class ClinicalAiService {
  private readonly logger = new Logger(ClinicalAiService.name);

  constructor(private openaiService: OpenaiService) {}

  async analyzePrescription(
    request: PrescriptionAnalysisRequest,
  ): Promise<PrescriptionAnalysisResponse> {
    return this.openaiService
      .callChatCompletion({
        systemPrompt:
          'You are a clinical pharmacist. Analyze prescriptions for interactions and contraindications. Return JSON.',
        userPrompt: this.buildPrescriptionAnalysisPrompt(request),
        cacheKeyPrefix: 'prescription-analysis',
        cacheKeyData: request,
      })
      .then((parsed) =>
        normalizePrescriptionAnalysis(isRecord(parsed) ? parsed : {}),
      );
  }

  async suggestDiagnoses(
    symptoms: string[],
    findingsNotes?: string,
  ): Promise<DiagnosisSuggestion[]> {
    return this.openaiService
      .callChatCompletion({
        systemPrompt:
          'You are a clinical diagnostician. Suggest ICD-10 diagnoses based on symptoms. Return JSON array.',
        userPrompt: this.buildDiagnosisSuggestionsPrompt(
          symptoms,
          findingsNotes,
        ),
        cacheKeyPrefix: 'diagnosis-suggestions',
        cacheKeyData: { symptoms, findingsNotes },
      })
      .then((parsed) => this.normalizeDiagnosisSuggestions(parsed));
  }

  async recommendMedications(
    condition: string,
    patientAge?: number,
    allergies?: string[],
  ): Promise<MedicationRecommendation[]> {
    return this.openaiService
      .callChatCompletion({
        systemPrompt:
          'You are a clinical pharmacist. Recommend medications for the condition. Return JSON array.',
        userPrompt: this.buildMedicationRecommendationPrompt(
          condition,
          patientAge,
          allergies,
        ),
        cacheKeyPrefix: 'medication-recommendations',
        cacheKeyData: { condition, patientAge, allergies },
      })
      .then((parsed) => this.normalizeMedicationRecommendations(parsed));
  }

  private buildPrescriptionAnalysisPrompt(
    request: PrescriptionAnalysisRequest,
  ): string {
    const medString = request.medications
      .map((m) => `${m.name} ${m.dosage}`)
      .join(', ');
    return `Analyze: Medications: ${medString}, Age: ${request.patientAge || 'Unknown'}, Allergies: ${request.patientAllergies?.join(', ') || 'None'}. Return JSON with drugInteractions, contraindications, dosageRecommendations.`;
  }

  private buildDiagnosisSuggestionsPrompt(
    symptoms: string[],
    findingsNotes?: string,
  ): string {
    return `Symptoms: ${symptoms.join(', ')}, Findings: ${findingsNotes || 'None'}. Suggest top 5 diagnoses with icdCode, diagnosis, confidence, description.`;
  }

  private buildMedicationRecommendationPrompt(
    condition: string,
    patientAge?: number,
    allergies?: string[],
  ): string {
    return `Condition: ${condition}, Age: ${patientAge || 'Unknown'}, Allergies: ${allergies?.join(', ') || 'None'}. Recommend 3-5 medications with medicationName, strength, frequency, indication, confidence.`;
  }

  private normalizeDiagnosisSuggestions(data: unknown): DiagnosisSuggestion[] {
    const suggestions = Array.isArray(data)
      ? data
      : isRecord(data) && Array.isArray(data.suggestions)
        ? data.suggestions
        : [];
    return suggestions
      .slice(0, 10)
      .filter(
        (s: RawDiagnosisSuggestion) =>
          (s.icdCode || s.diagnosis) && (s.condition || s.diagnosis),
      )
      .map((s: RawDiagnosisSuggestion) => ({
        icdCode: s.icdCode || 'R69',
        diagnosis: s.condition || s.diagnosis || 'Unknown Condition',
        confidence: Math.min(Math.max(s.confidence || 0, 0), 100),
        description: s.description || 'Clinical correlation required',
      }));
  }

  private normalizeMedicationRecommendations(
    data: unknown,
  ): MedicationRecommendation[] {
    const recommendations = Array.isArray(data)
      ? data
      : isRecord(data) && Array.isArray(data.recommendations)
        ? data.recommendations
        : [];
    return recommendations
      .slice(0, 10)
      .filter((r: RawMedicationRecommendation) => r.medicationName)
      .map((r: RawMedicationRecommendation) => ({
        medicationName: r.medicationName || 'Unknown Medication',
        strength: r.strength || 'As per clinical judgment',
        frequency: r.frequency || 'As per clinical judgment',
        indication: r.indication || '',
        confidence: Math.min(Math.max(r.confidence || 0, 0), 100),
      }));
  }
}
