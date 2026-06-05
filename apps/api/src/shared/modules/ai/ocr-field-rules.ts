import { OcrRawData } from '@workspace/types';
import { parseStringEnumMember } from '@workspace/utils';
import { extractLabValues, extractVitals } from './ocr-basic-field-extractors';
import { extractInvoice } from './ocr-invoice-field-extractor';
import { extractMedications } from './ocr-medication-field-extractor';
import { toOcrString, truthyArray } from './ocr-field-utils';

const OCR_GENDER_VALUES = ['MALE', 'FEMALE', 'OTHER'] as const;

type ConfidenceGroup = 'medical' | 'contact';

interface FieldRule {
  key: string;
  extract: (data: OcrRawData | null | undefined) => unknown;
  confidenceGroup?: ConfidenceGroup;
}

export const FIELD_RULES: FieldRule[] = [
  {
    key: 'firstName',
    extract: (d) => d?.firstName ?? '',
    confidenceGroup: 'contact',
  },
  {
    key: 'lastName',
    extract: (d) => d?.lastName ?? '',
    confidenceGroup: 'contact',
  },
  { key: 'age', extract: (d) => toOcrString(d?.age) },
  { key: 'dateOfBirth', extract: (d) => d?.dateOfBirth ?? '' },
  {
    key: 'gender',
    extract: (d) =>
      parseStringEnumMember(OCR_GENDER_VALUES, d?.gender ?? '') ?? 'OTHER',
  },
  {
    key: 'phoneNumber',
    extract: (d) => d?.phoneNumber ?? '',
    confidenceGroup: 'contact',
  },
  { key: 'email', extract: (d) => d?.email ?? '', confidenceGroup: 'contact' },
  { key: 'bloodType', extract: (d) => d?.bloodType ?? '' },
  { key: 'patientId', extract: (d) => d?.patientId ?? '' },

  {
    key: 'diagnosis',
    extract: (d) => d?.diagnosis ?? '',
    confidenceGroup: 'medical',
  },
  {
    key: 'symptoms',
    extract: (d) => truthyArray(d?.symptoms),
  },
  {
    key: 'medicalHistory',
    extract: (d) => truthyArray(d?.medicalHistory),
  },
  {
    key: 'complaints',
    extract: (d) => (d?.complaints ? [d.complaints] : []),
  },
  {
    key: 'allergies',
    extract: (d) => truthyArray(d?.allergies),
    confidenceGroup: 'medical',
  },
  { key: 'physicalExamination', extract: (d) => d?.physicalExamination ?? '' },

  {
    key: 'vitals',
    extract: extractVitals,
    confidenceGroup: 'medical',
  },

  {
    key: 'labValues',
    extract: extractLabValues,
  },

  {
    key: 'medications',
    extract: extractMedications,
    confidenceGroup: 'medical',
  },

  { key: 'prescriptionDate', extract: (d) => d?.prescriptionDate ?? '' },
  { key: 'prescriptionId', extract: (d) => d?.prescriptionId ?? '' },
  { key: 'documentDate', extract: (d) => d?.documentDate ?? '' },
  { key: 'visitDate', extract: (d) => d?.visitDate ?? '' },
  { key: 'visitTime', extract: (d) => d?.visitTime ?? '' },
  { key: 'expiryDate', extract: (d) => d?.expiryDate ?? '' },
  { key: 'nextVisitDate', extract: (d) => d?.nextVisitDate ?? '' },
  { key: 'referralDate', extract: (d) => d?.referralDate ?? '' },

  { key: 'doctorName', extract: (d) => d?.doctorName ?? '' },
  { key: 'doctorLicense', extract: (d) => d?.doctorLicense ?? '' },
  {
    key: 'doctorSpecialization',
    extract: (d) => d?.doctorSpecialization ?? '',
  },

  { key: 'clinicName', extract: (d) => d?.clinicName ?? '' },
  { key: 'clinicAddress', extract: (d) => d?.clinicAddress ?? '' },
  { key: 'clinicPhone', extract: (d) => d?.clinicPhone ?? '' },

  { key: 'referralTo', extract: (d) => d?.referralTo ?? '' },

  { key: 'notes', extract: (d) => d?.notes ?? '' },

  {
    key: 'followUpRecommendations',
    extract: (d) => truthyArray(d?.followUpRecommendations),
  },

  {
    key: 'invoice',
    extract: extractInvoice,
  },
];
