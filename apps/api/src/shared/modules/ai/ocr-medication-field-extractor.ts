import type { OcrRawData } from '@workspace/types';

export function extractMedications(data: OcrRawData | null | undefined) {
  return Array.isArray(data?.medications)
    ? data.medications.filter(hasMedicationName).map(toMedicationFields)
    : [];
}

function hasMedicationName(
  medication: NonNullable<OcrRawData['medications']>[number],
): boolean {
  return Boolean(medication?.name);
}

function toMedicationFields(
  medication: NonNullable<OcrRawData['medications']>[number],
) {
  return {
    name: medication.name ?? '',
    dosage: medication.dosage ?? '',
    frequency: medication.frequency ?? '',
    route: medication.route ?? '',
    duration: medication.duration ?? '',
    indication: medication.indication ?? '',
    strength: medication.strength ?? '',
    quantity: medication.quantity ?? '',
  };
}
