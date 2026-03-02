import { Injectable, Logger } from '@nestjs/common';
import { ParsedMedicalFields } from '@workspace/types';

@Injectable()
export class ConfidenceScorerService {
  private readonly logger = new Logger(ConfidenceScorerService.name);

  generateConfidenceScores(
    extractedText: string,
    fields: ParsedMedicalFields,
  ): Record<string, number> {
    const scores: Record<string, number> = {};

    scores.firstName = fields.firstName ? 0.7 : 0.2;
    scores.lastName = fields.lastName ? 0.7 : 0.2;
    scores.mrn = fields.mrn ? 0.85 : 0.2;
    scores.preferredName = fields.preferredName ? 0.7 : 0.2;
    scores.pronouns = fields.pronouns ? 0.8 : 0.2;
    scores.address = fields.address ? 0.7 : 0.2;
    scores.maritalStatus = fields.maritalStatus ? 0.7 : 0.2;
    scores.preferredLanguage = fields.preferredLanguage ? 0.7 : 0.2;
    scores.race = fields.race ? 0.7 : 0.2;
    scores.ethnicity = fields.ethnicity ? 0.7 : 0.2;
    scores.age = fields.age ? 0.8 : 0.2;
    scores.phoneNumber = fields.phoneNumber ? 0.85 : 0.2;
    scores.email = fields.email ? 0.9 : 0.2;
    scores.bloodType = fields.bloodType ? 0.75 : 0.2;
    scores.emergencyContact = fields.emergencyContact ? 0.8 : 0.2;

    scores.dateOfBirth = fields.dateOfBirth ? 0.9 : 0.2;
    scores.visitDate = fields.visitDate ? 0.8 : 0.2;
    scores.invoiceDate = fields.invoiceDate ? 0.8 : 0.2;
    scores.admissionDate = fields.admissionDate ? 0.8 : 0.2;

    scores.clinicName = fields.clinicName ? 0.7 : 0.2;
    scores.doctorName = fields.doctorName ? 0.7 : 0.2;

    scores.diagnosis = fields.diagnosis ? 0.65 : 0.2;

    scores['vitals.bp'] = fields.vitals?.bp ? 0.8 : 0.2;
    scores['vitals.temp'] = fields.vitals?.temp ? 0.75 : 0.2;
    scores['vitals.pulse'] = fields.vitals?.pulse ? 0.8 : 0.2;
    scores['vitals.spO2'] = fields.vitals?.spO2 ? 0.8 : 0.2;

    scores['labValues.glucose'] = fields.labValues?.glucose ? 0.8 : 0.2;
    scores['labValues.hemoglobin'] = fields.labValues?.hemoglobin ? 0.8 : 0.2;
    scores['labValues.creatinine'] = fields.labValues?.creatinine ? 0.8 : 0.2;

    scores.medications = fields.medications?.length > 0 ? 0.7 : 0.2;
    scores.symptoms = fields.symptoms?.length > 0 ? 0.5 : 0.2;
    scores.allergies = fields.allergies?.length > 0 ? 0.5 : 0.2;

    scores['invoice.total'] = fields.invoice?.total !== null ? 0.85 : 0.2;
    scores['invoice.items'] = fields.invoice?.items?.length > 0 ? 0.7 : 0.2;

    this.logger.debug(
      `[OCR] Generated confidence scores for ${Object.keys(scores).length} fields`,
    );

    return scores;
  }
}
