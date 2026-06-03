import { Injectable, Logger } from '@nestjs/common';
import { ParsedMedicalFields } from '@workspace/types';

type FieldResolver = (fields: ParsedMedicalFields) => unknown;

const CONFIDENCE_SCORING: Record<
  string,
  { score: number; resolver: FieldResolver }
> = {
  firstName: { score: 0.7, resolver: (f) => f.firstName },
  lastName: { score: 0.7, resolver: (f) => f.lastName },
  mrn: { score: 0.85, resolver: (f) => f.mrn },
  preferredName: { score: 0.7, resolver: (f) => f.preferredName },
  pronouns: { score: 0.8, resolver: (f) => f.pronouns },
  address: { score: 0.7, resolver: (f) => f.address },
  maritalStatus: { score: 0.7, resolver: (f) => f.maritalStatus },
  preferredLanguage: { score: 0.7, resolver: (f) => f.preferredLanguage },
  race: { score: 0.7, resolver: (f) => f.race },
  ethnicity: { score: 0.7, resolver: (f) => f.ethnicity },
  age: { score: 0.8, resolver: (f) => f.age },
  phoneNumber: { score: 0.85, resolver: (f) => f.phoneNumber },
  email: { score: 0.9, resolver: (f) => f.email },
  bloodType: { score: 0.75, resolver: (f) => f.bloodType },
  emergencyContact: { score: 0.8, resolver: (f) => f.emergencyContact },
  dateOfBirth: { score: 0.9, resolver: (f) => f.dateOfBirth },
  visitDate: { score: 0.8, resolver: (f) => f.visitDate },
  invoiceDate: { score: 0.8, resolver: (f) => f.invoiceDate },
  admissionDate: { score: 0.8, resolver: (f) => f.admissionDate },
  clinicName: { score: 0.7, resolver: (f) => f.clinicName },
  doctorName: { score: 0.7, resolver: (f) => f.doctorName },
  diagnosis: { score: 0.65, resolver: (f) => f.diagnosis },
  'vitals.bp': { score: 0.8, resolver: (f) => f.vitals?.bp },
  'vitals.temp': { score: 0.75, resolver: (f) => f.vitals?.temp },
  'vitals.pulse': { score: 0.8, resolver: (f) => f.vitals?.pulse },
  'vitals.spO2': { score: 0.8, resolver: (f) => f.vitals?.spO2 },
  'labValues.glucose': { score: 0.8, resolver: (f) => f.labValues?.glucose },
  'labValues.hemoglobin': {
    score: 0.8,
    resolver: (f) => f.labValues?.hemoglobin,
  },
  'labValues.creatinine': {
    score: 0.8,
    resolver: (f) => f.labValues?.creatinine,
  },
  medications: {
    score: 0.7,
    resolver: (f) => (f.medications?.length ?? 0) > 0,
  },
  symptoms: { score: 0.5, resolver: (f) => (f.symptoms?.length ?? 0) > 0 },
  allergies: { score: 0.5, resolver: (f) => (f.allergies?.length ?? 0) > 0 },
  'invoice.total': { score: 0.85, resolver: (f) => f.invoice?.total !== null },
  'invoice.items': {
    score: 0.7,
    resolver: (f) => (f.invoice?.items?.length ?? 0) > 0,
  },
};

@Injectable()
export class ConfidenceScorerService {
  private readonly logger = new Logger(ConfidenceScorerService.name);

  generateConfidenceScores(
    _extractedText: string,
    fields: ParsedMedicalFields,
  ): Record<string, number> {
    const scores: Record<string, number> = {};

    for (const [key, config] of Object.entries(CONFIDENCE_SCORING)) {
      scores[key] = config.resolver(fields) ? config.score : 0.2;
    }

    this.logger.debug(
      `[OCR] Generated confidence scores for ${Object.keys(scores).length} fields`,
    );

    return scores;
  }
}
