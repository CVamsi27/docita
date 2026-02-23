import { PrescriptionAnalysisRequest } from '@workspace/types';

export function buildPrescriptionAnalysisPrompt(
  request: PrescriptionAnalysisRequest,
): string {
  const medString = request.medications
    .map((medication) => `${medication.name} ${medication.dosage}`)
    .join(', ');

  return `Analyze: Medications: ${medString}, Age: ${request.patientAge || 'Unknown'}, Allergies: ${request.patientAllergies?.join(', ') || 'None'}. Return JSON with drugInteractions, contraindications, dosageRecommendations.`;
}

export function buildDiagnosisSuggestionsPrompt(
  symptoms: string[],
  findingsNotes?: string,
): string {
  return `Symptoms: ${symptoms.join(', ')}, Findings: ${findingsNotes || 'None'}. Suggest top 5 diagnoses with icdCode, diagnosis, confidence, description.`;
}

export function buildMedicationRecommendationPrompt(
  condition: string,
  patientAge?: number,
  allergies?: string[],
): string {
  return `Condition: ${condition}, Age: ${patientAge || 'Unknown'}, Allergies: ${allergies?.join(', ') || 'None'}. Recommend 3-5 medications with medicationName, strength, frequency, indication, confidence.`;
}
