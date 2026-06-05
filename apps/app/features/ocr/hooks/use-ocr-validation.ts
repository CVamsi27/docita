import type { OCRFormData } from "@/features/ocr/types";
import { buildInvoiceDraftForCommit } from "./use-ocr-helpers";

type OcrSaveBlockerCategory = "auth" | "form";

export interface OcrSaveBlocker {
  category: OcrSaveBlockerCategory;
  message: string;
}

export interface OcrSaveBlockerInput {
  clinicId: string | null | undefined;
  userId: string | null | undefined;
  formData: OCRFormData;
  needsReviewAcknowledgement: boolean;
  reviewAcknowledged: boolean;
}

export function getOcrSaveBlocker(
  input: OcrSaveBlockerInput,
): OcrSaveBlocker | null {
  if (!input.clinicId)
    return { category: "form", message: "Select a facility to continue" };
  if (!input.userId)
    return { category: "auth", message: "Please sign in again to continue" };
  if (!hasPatientName(input.formData)) {
    return {
      category: "form",
      message: "Enter the patient's first and last name",
    };
  }
  if (!input.formData.phoneNumber.trim()) {
    return { category: "form", message: "Enter the patient's phone number" };
  }
  if (input.needsReviewAcknowledgement && !input.reviewAcknowledged) {
    return {
      category: "form",
      message: "Confirm you have reviewed low-confidence fields before saving",
    };
  }
  if (
    input.formData.invoice.saveAsPending &&
    !buildInvoiceDraftForCommit(input.formData.invoice)
  ) {
    return {
      category: "form",
      message:
        "To save a pending invoice, add at least one line with description, quantity, unit price, and total (or leave total blank when quantity and unit price are set), and enter a positive grand total.",
    };
  }
  if (!hasValidBirthInput(input.formData)) {
    return { category: "form", message: "Enter a valid date of birth or age" };
  }
  return null;
}

function hasPatientName(formData: OCRFormData): boolean {
  return (
    formData.firstName.trim().length > 0 && formData.lastName.trim().length > 0
  );
}

export function hasValidBirthInput(formData: OCRFormData): boolean {
  if (!formData.dateOfBirth.trim() && !formData.age.trim()) return true;
  const birthDate = formData.dateOfBirth.trim()
    ? new Date(formData.dateOfBirth)
    : new Date(
        new Date().getFullYear() - (parseInt(formData.age, 10) || 0),
        0,
        1,
      );
  return !Number.isNaN(birthDate.getTime());
}
