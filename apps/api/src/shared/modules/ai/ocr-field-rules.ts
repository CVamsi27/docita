import { OcrRawData } from '@workspace/types';
import { parseStringEnumMember } from '@workspace/utils';

const OCR_GENDER_VALUES = ['MALE', 'FEMALE', 'OTHER'] as const;

export type ConfidenceGroup = 'medical' | 'contact';

export interface FieldRule {
  key: string;
  extract: (data: OcrRawData | null | undefined) => unknown;
  confidenceGroup?: ConfidenceGroup;
}

const toStr = (val: string | number | undefined): string =>
  val !== undefined && val !== null ? String(val) : '';

export const FIELD_RULES: FieldRule[] = [
  // ── Patient identity ──────────────────────────────────────
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
  { key: 'age', extract: (d) => toStr(d?.age) },
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

  // ── Clinical data ─────────────────────────────────────────
  {
    key: 'diagnosis',
    extract: (d) => d?.diagnosis ?? '',
    confidenceGroup: 'medical',
  },
  {
    key: 'symptoms',
    extract: (d) =>
      Array.isArray(d?.symptoms) ? d.symptoms.filter(Boolean) : [],
  },
  {
    key: 'medicalHistory',
    extract: (d) =>
      Array.isArray(d?.medicalHistory) ? d.medicalHistory.filter(Boolean) : [],
  },
  {
    key: 'complaints',
    extract: (d) => (d?.complaints ? [d.complaints] : []),
  },
  {
    key: 'allergies',
    extract: (d) =>
      Array.isArray(d?.allergies) ? d.allergies.filter(Boolean) : [],
    confidenceGroup: 'medical',
  },
  { key: 'physicalExamination', extract: (d) => d?.physicalExamination ?? '' },

  // ── Vitals (confidence=medical to match original medicalCriticalFields) ──
  {
    key: 'vitals',
    extract: (d) => ({
      bp: d?.vitals?.bp ?? '',
      temp: toStr(d?.vitals?.temp),
      pulse: toStr(d?.vitals?.pulse),
      respiratoryRate: toStr(d?.vitals?.respiratoryRate),
      spO2: toStr(d?.vitals?.spO2),
      weight: toStr(d?.vitals?.weight),
      height: toStr(d?.vitals?.height),
      bmi: toStr(d?.vitals?.bmi),
    }),
    confidenceGroup: 'medical',
  },

  // ── Lab values (spread includes extra raw fields) ──
  {
    key: 'labValues',
    extract: (d) => ({
      hemoglobin: d?.labValues?.hemoglobin ?? '',
      creatinine: d?.labValues?.creatinine ?? '',
      glucose: d?.labValues?.glucose ?? '',
      ...(d?.labValues ?? {}),
    }),
  },

  // ── Medications ──────────────────────────────────────────
  {
    key: 'medications',
    extract: (d) =>
      Array.isArray(d?.medications)
        ? d.medications
            .filter((m) => m?.name)
            .map((m) => ({
              name: m.name ?? '',
              dosage: m.dosage ?? '',
              frequency: m.frequency ?? '',
              route: m.route ?? '',
              duration: m.duration ?? '',
              indication: m.indication ?? '',
              strength: m.strength ?? '',
              quantity: m.quantity ?? '',
            }))
        : [],
    confidenceGroup: 'medical',
  },

  // ── Dates ────────────────────────────────────────────────
  { key: 'prescriptionDate', extract: (d) => d?.prescriptionDate ?? '' },
  { key: 'prescriptionId', extract: (d) => d?.prescriptionId ?? '' },
  { key: 'documentDate', extract: (d) => d?.documentDate ?? '' },
  { key: 'visitDate', extract: (d) => d?.visitDate ?? '' },
  { key: 'visitTime', extract: (d) => d?.visitTime ?? '' },
  { key: 'expiryDate', extract: (d) => d?.expiryDate ?? '' },
  { key: 'nextVisitDate', extract: (d) => d?.nextVisitDate ?? '' },
  { key: 'referralDate', extract: (d) => d?.referralDate ?? '' },

  // ── Doctor ───────────────────────────────────────────────
  { key: 'doctorName', extract: (d) => d?.doctorName ?? '' },
  { key: 'doctorLicense', extract: (d) => d?.doctorLicense ?? '' },
  {
    key: 'doctorSpecialization',
    extract: (d) => d?.doctorSpecialization ?? '',
  },

  // ── Clinic ───────────────────────────────────────────────
  { key: 'clinicName', extract: (d) => d?.clinicName ?? '' },
  { key: 'clinicAddress', extract: (d) => d?.clinicAddress ?? '' },
  { key: 'clinicPhone', extract: (d) => d?.clinicPhone ?? '' },

  // ── Referral ─────────────────────────────────────────────
  { key: 'referralTo', extract: (d) => d?.referralTo ?? '' },

  // ── Notes ────────────────────────────────────────────────
  { key: 'notes', extract: (d) => d?.notes ?? '' },

  // ── Follow-up ────────────────────────────────────────────
  {
    key: 'followUpRecommendations',
    extract: (d) =>
      Array.isArray(d?.followUpRecommendations)
        ? d.followUpRecommendations.filter(Boolean)
        : [],
  },

  // ── Invoice ──────────────────────────────────────────────
  {
    key: 'invoice',
    extract: (d) =>
      d?.invoice
        ? {
            invoiceNumber: d.invoice.invoiceNumber ?? '',
            invoiceDate: d.invoice.invoiceDate ?? '',
            totalAmount: toStr(d.invoice.totalAmount),
            components: Array.isArray(d.invoice.components)
              ? d.invoice.components
                  .filter((c) => c?.description)
                  .map((c) => ({
                    description: c.description ?? '',
                    amount: toStr(c.amount),
                    quantity: toStr(c.quantity),
                  }))
              : [],
            consultationFee: toStr(d.invoice.consultationFee),
            testsFee: toStr(d.invoice.testsFee),
            procedureFee: toStr(d.invoice.procedureFee),
            medicationFee: toStr(d.invoice.medicationFee),
            discount: toStr(d.invoice.discount),
            discountPercentage: toStr(d.invoice.discountPercentage),
            taxAmount: toStr(d.invoice.taxAmount),
            paymentMethod: d.invoice.paymentMethod ?? '',
            paymentStatus: d.invoice.paymentStatus ?? '',
          }
        : undefined,
  },
];
