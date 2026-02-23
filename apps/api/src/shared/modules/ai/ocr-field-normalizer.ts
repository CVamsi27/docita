import {
  OcrExtractedFields,
  FieldConfidenceConfig,
  OcrRawData,
} from '@workspace/types';

export function calculateOverallConfidence(
  fieldConfidence: Record<string, number>,
): number {
  const scores = Object.values(fieldConfidence);
  return scores.length
    ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) /
        100
    : 0;
}

export function normalizeOcrFields(
  data: OcrRawData | null | undefined,
  config: FieldConfidenceConfig,
): OcrExtractedFields {
  const fieldConfidence: Record<string, number> = {};

  const assignConfidence = (key: string, hasValue: boolean): number => {
    if (!hasValue) return 0.3;
    const medicalCriticalFields = [
      'diagnosis',
      'allergies',
      'medications',
      'vitals',
    ];
    const contactFields = ['phoneNumber', 'email', 'firstName', 'lastName'];
    const vitalFields = ['bp', 'temp', 'pulse', 'respiratoryRate', 'spO2'];
    const invoiceFields = ['invoiceNumber', 'totalAmount', 'components'];

    if (medicalCriticalFields.includes(key)) return config.medicalFields;
    if (contactFields.includes(key)) return config.contactFields;
    if (vitalFields.includes(key)) return config.vitalFields;
    if (invoiceFields.includes(key)) return 0.8;
    return 0.75;
  };

  const toStr = (val: string | number | undefined): string =>
    val !== undefined && val !== null ? String(val) : '';

  const result: OcrExtractedFields = {
    firstName: data?.firstName || '',
    lastName: data?.lastName || '',
    age: toStr(data?.age),
    dateOfBirth: data?.dateOfBirth || '',
    gender: ['MALE', 'FEMALE', 'OTHER'].includes(data?.gender || '')
      ? (data?.gender as 'MALE' | 'FEMALE' | 'OTHER')
      : 'OTHER',
    phoneNumber: data?.phoneNumber || '',
    email: data?.email || '',
    bloodType: data?.bloodType || '',
    patientId: data?.patientId || '',
    diagnosis: data?.diagnosis || '',
    symptoms: Array.isArray(data?.symptoms)
      ? data.symptoms.filter((s) => s)
      : [],
    medicalHistory: Array.isArray(data?.medicalHistory)
      ? data.medicalHistory.filter((m) => m)
      : [],
    complaints: data?.complaints ? [data.complaints] : [],
    allergies: Array.isArray(data?.allergies)
      ? data.allergies.filter((a) => a)
      : [],
    physicalExamination: data?.physicalExamination || '',
    vitals: {
      bp: data?.vitals?.bp || '',
      temp: toStr(data?.vitals?.temp),
      pulse: toStr(data?.vitals?.pulse),
      respiratoryRate: toStr(data?.vitals?.respiratoryRate),
      spO2: toStr(data?.vitals?.spO2),
      weight: toStr(data?.vitals?.weight),
      height: toStr(data?.vitals?.height),
      bmi: toStr(data?.vitals?.bmi),
    },
    labValues: {
      hemoglobin: data?.labValues?.hemoglobin || '',
      creatinine: data?.labValues?.creatinine || '',
      glucose: data?.labValues?.glucose || '',
      ...data?.labValues,
    },
    medications: Array.isArray(data?.medications)
      ? data.medications
          .filter((m) => m?.name)
          .map((m) => ({
            name: m.name || '',
            dosage: m.dosage || '',
            frequency: m.frequency || '',
            route: m.route || '',
            duration: m.duration || '',
            indication: m.indication || '',
            strength: m.strength || '',
            quantity: m.quantity || '',
          }))
      : [],
    prescriptionDate: data?.prescriptionDate || '',
    prescriptionId: data?.prescriptionId || '',
    documentDate: data?.documentDate || '',
    visitDate: data?.visitDate || '',
    visitTime: data?.visitTime || '',
    expiryDate: data?.expiryDate || '',
    nextVisitDate: data?.nextVisitDate || '',
    referralDate: data?.referralDate || '',
    doctorName: data?.doctorName || '',
    doctorLicense: data?.doctorLicense || '',
    doctorSpecialization: data?.doctorSpecialization || '',
    clinicName: data?.clinicName || '',
    clinicAddress: data?.clinicAddress || '',
    clinicPhone: data?.clinicPhone || '',
    referralTo: data?.referralTo || '',
    notes: data?.notes || '',
    followUpRecommendations: Array.isArray(data?.followUpRecommendations)
      ? data.followUpRecommendations.filter((r) => r)
      : [],
    invoice: data?.invoice
      ? {
          invoiceNumber: data.invoice.invoiceNumber || '',
          invoiceDate: data.invoice.invoiceDate || '',
          totalAmount: toStr(data.invoice.totalAmount),
          components: Array.isArray(data.invoice.components)
            ? data.invoice.components
                .filter((c) => c?.description)
                .map((c) => ({
                  description: c.description || '',
                  amount: toStr(c.amount),
                  quantity: toStr(c.quantity),
                }))
            : [],
          consultationFee: toStr(data.invoice.consultationFee),
          testsFee: toStr(data.invoice.testsFee),
          procedureFee: toStr(data.invoice.procedureFee),
          medicationFee: toStr(data.invoice.medicationFee),
          discount: toStr(data.invoice.discount),
          discountPercentage: toStr(data.invoice.discountPercentage),
          taxAmount: toStr(data.invoice.taxAmount),
          paymentMethod: data.invoice.paymentMethod || '',
          paymentStatus: data.invoice.paymentStatus || '',
        }
      : undefined,
    fieldConfidence: {},
  };

  Object.entries(result).forEach(([key, value]) => {
    if (key === 'fieldConfidence') return;
    const hasValue =
      value &&
      (typeof value === 'string'
        ? value.trim() !== ''
        : Array.isArray(value)
          ? value.length > 0
          : Object.values(value).some((v) => v));
    fieldConfidence[key] = assignConfidence(key, hasValue);
  });

  result.fieldConfidence = fieldConfidence;
  return result;
}
