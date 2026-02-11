import { Injectable, Logger } from '@nestjs/common';
import { OpenaiService } from './openai.service';
import {
  PrescriptionAnalysisRequest,
  PrescriptionAnalysisResponse,
  DiagnosisSuggestion,
  MedicationRecommendation,
} from '@workspace/types';

interface RawDrugInteraction {
  drug1?: string;
  drug2?: string;
  severity?: string;
  description?: string;
}

interface RawContraindication {
  medication?: string;
  condition?: string;
  description?: string;
}

interface RawDosageRecommendation {
  medication?: string;
  status?: string;
  recommendation?: string;
}

interface RawPrescriptionAnalysis {
  drugInteractions?: RawDrugInteraction[];
  contraindications?: RawContraindication[];
  dosageRecommendations?: RawDosageRecommendation[];
}

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
      .then((parsed) => this.normalizePrescriptionAnalysis(parsed));
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

  private normalizePrescriptionAnalysis(
    data: RawPrescriptionAnalysis,
  ): PrescriptionAnalysisResponse {
    const validSeverities = ['mild', 'moderate', 'severe'] as const;
    const validStatuses = ['appropriate', 'high', 'low'] as const;

    return {
      drugInteractions: (data.drugInteractions || [])
        .slice(0, 10)
        .map((i: RawDrugInteraction) => {
          const rawSeverity = i.severity?.toLowerCase();
          const severity: 'mild' | 'moderate' | 'severe' = (
            validSeverities as readonly string[]
          ).includes(rawSeverity || '')
            ? (rawSeverity as 'mild' | 'moderate' | 'severe')
            : 'moderate';

          return {
            drug1: i.drug1 || 'Unknown',
            drug2: i.drug2 || 'Unknown',
            severity,
            description: i.description || 'No description',
          };
        }),
      contraindications: (data.contraindications || [])
        .slice(0, 10)
        .map((c: RawContraindication) => ({
          medication: c.medication || 'Unknown',
          condition: c.condition || 'Unknown',
          description: c.description || 'No description',
        })),
      dosageRecommendations: (data.dosageRecommendations || [])
        .slice(0, 10)
        .map((r: RawDosageRecommendation) => {
          const rawStatus = r.status?.toLowerCase();
          const status: 'appropriate' | 'high' | 'low' = (
            validStatuses as readonly string[]
          ).includes(rawStatus || '')
            ? (rawStatus as 'appropriate' | 'high' | 'low')
            : 'appropriate';

          return {
            medication: r.medication || 'Unknown',
            status,
            recommendation: r.recommendation || 'No recommendation',
          };
        }),
    };
  }

  private normalizeDiagnosisSuggestions(
    data: RawDiagnosisSuggestion[] | { suggestions: RawDiagnosisSuggestion[] },
  ): DiagnosisSuggestion[] {
    const suggestions = Array.isArray(data) ? data : data.suggestions || [];
    return suggestions
      .slice(0, 10)
      .filter(
        (s: RawDiagnosisSuggestion) =>
          (s.icdCode || s.diagnosis) && (s.condition || s.diagnosis),
      )
      .map((s: RawDiagnosisSuggestion) => ({
        icdCode: s.icdCode || 'R69', // Default to 'Illness, unspecified' if missing
        condition: s.condition || s.diagnosis || 'Unknown Condition',
        confidence: Math.min(Math.max(s.confidence || 0, 0), 100),
        reasoning: s.description || 'Clinical correlation required',
      }));
  }

  private normalizeMedicationRecommendations(
    data:
      | RawMedicationRecommendation[]
      | { recommendations: RawMedicationRecommendation[] },
  ): MedicationRecommendation[] {
    const recommendations = Array.isArray(data)
      ? data
      : data.recommendations || [];
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
