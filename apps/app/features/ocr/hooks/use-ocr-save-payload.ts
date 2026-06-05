import { type OcrImportCommitRequest } from "@workspace/types";
import { parseStringEnumMember } from "@workspace/utils";
import type { OCRFormData } from "@/features/ocr/types";
import { buildInvoiceDraftForCommit } from "./use-ocr-invoice-mapping";

type OcrVitalsPayload = NonNullable<OcrImportCommitRequest["vitals"]>;
type OcrMedicationPayload = NonNullable<
  OcrImportCommitRequest["medications"]
>[number];

export function buildOcrVitalsPayload(
  formVitals: OCRFormData["vitals"],
): OcrVitalsPayload {
  const payload: OcrVitalsPayload = {};
  const [systolic, diastolic] = formVitals.bp ? formVitals.bp.split("/") : [];
  addInteger(payload, "systolicBP", systolic);
  addInteger(payload, "diastolicBP", diastolic);
  addFloat(payload, "temperature", formVitals.temp);
  addInteger(payload, "pulse", formVitals.pulse);
  return payload;
}

export function buildOcrSavePayload(
  formData: OCRFormData,
  clinicId: string,
  userId: string,
  needsReviewAcknowledgement: boolean,
  reviewAcknowledged: boolean,
): OcrImportCommitRequest {
  const vitalsPayload = buildOcrVitalsPayload(formData.vitals);
  return {
    clinicId,
    doctorId: userId,
    firstName: formData.firstName.trim(),
    lastName: formData.lastName.trim(),
    phoneNumber: formData.phoneNumber.trim(),
    gender:
      parseStringEnumMember(
        ["MALE", "FEMALE", "OTHER"] as const,
        formData.gender,
      ) ?? "OTHER",
    dateOfBirth: resolveDobIso(formData),
    address: optionalText(formData.address),
    diagnosis: optionalText(formData.diagnosis),
    allergies: formData.allergies.length > 0 ? formData.allergies : undefined,
    medications: buildMedicationPayload(formData),
    vitals: hasVitals(vitalsPayload) ? vitalsPayload : undefined,
    consultationNotes: optionalText(formData.diagnosis),
    acknowledgeReview: needsReviewAcknowledgement
      ? reviewAcknowledged
      : undefined,
    invoiceDraft: buildInvoiceDraftForCommit(formData.invoice),
  };
}

function resolveDobIso(formData: OCRFormData): string {
  const birthDate = formData.dateOfBirth.trim()
    ? new Date(formData.dateOfBirth)
    : new Date(
        new Date().getFullYear() - (parseInt(formData.age, 10) || 0),
        0,
        1,
      );
  return birthDate.toISOString();
}

function optionalText(raw: string): string | undefined {
  const value = raw.trim();
  return value.length > 0 ? value : undefined;
}

function buildMedicationPayload(
  formData: OCRFormData,
): OcrMedicationPayload[] | undefined {
  if (formData.medications.length === 0) return undefined;
  return formData.medications.map((medication) => ({
    name: medication.name.trim(),
    dosage: medication.dosage.trim() || "-",
    frequency: medication.frequency.trim() || "-",
    route: "PO",
    duration: "",
  }));
}

function hasVitals(payload: OcrVitalsPayload): boolean {
  return Object.values(payload).some((value) => value !== undefined);
}

function addInteger<Key extends keyof OcrVitalsPayload>(
  payload: OcrVitalsPayload,
  key: Key,
  raw: string | undefined,
): void {
  if (!raw?.trim()) return;
  payload[key] = parseInt(raw, 10);
}

function addFloat<Key extends keyof OcrVitalsPayload>(
  payload: OcrVitalsPayload,
  key: Key,
  raw: string,
): void {
  if (!raw.trim()) return;
  payload[key] = parseFloat(raw);
}
