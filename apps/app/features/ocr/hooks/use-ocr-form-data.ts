import type { ProcessOcrFields } from "@workspace/data-access";
import type { OCRFormData } from "@/features/ocr/types";
import { emptyOcrInvoiceForm, mapOcrFieldsToInvoiceForm } from "./use-ocr-invoice-mapping";

/** Builds the blank OCR review form seeded before any document has been scanned. */
export function emptyOcrFormData(): OCRFormData {
  return {
    firstName: "",
    lastName: "",
    age: "",
    gender: "MALE",
    dateOfBirth: "",
    phoneNumber: "",
    email: "",
    address: "",
    bloodType: "",
    diagnosis: "",
    symptoms: [],
    allergies: [],
    medicalHistory: [],
    medications: [],
    vitals: {
      bp: "",
      temp: "",
      pulse: "",
      respiratoryRate: "",
      spO2: "",
      glucose: "",
    },
    labValues: { glucose: "", hemoglobin: "", creatinine: "" },
    invoice: emptyOcrInvoiceForm(),
  };
}

export function buildOcrFormData(
  fields: ProcessOcrFields | undefined,
  resultFirstName: string | undefined,
  resultLastName: string | undefined,
  resultAge: string | undefined,
  resultGender: string | undefined,
  resultDiagnosis: string | undefined,
  resultPhoneNumber: string | undefined,
): OCRFormData {
  return {
    firstName: firstNonEmpty(fields?.firstName, resultFirstName),
    lastName: firstNonEmpty(fields?.lastName, resultLastName),
    age: firstNonEmpty(fields?.age, resultAge),
    gender: firstNonEmpty(fields?.gender, resultGender, "MALE"),
    phoneNumber: firstNonEmpty(fields?.phoneNumber, resultPhoneNumber),
    email: firstNonEmpty(fields?.email),
    dateOfBirth: "",
    address: "",
    bloodType: firstNonEmpty(fields?.bloodType),
    diagnosis: firstNonEmpty(fields?.diagnosis, resultDiagnosis),
    symptoms: fields?.symptoms || [],
    allergies: fields?.allergies || [],
    medicalHistory: fields?.medicalHistory || [],
    medications: fields?.medications || [],
    vitals: {
      bp: firstNonEmpty(fields?.vitals?.bp),
      temp: firstNonEmpty(fields?.vitals?.temp),
      pulse: firstNonEmpty(fields?.vitals?.pulse),
      respiratoryRate: firstNonEmpty(fields?.vitals?.respiratoryRate),
      spO2: firstNonEmpty(fields?.vitals?.spO2),
      glucose: firstNonEmpty(fields?.vitals?.glucose),
    },
    labValues: { glucose: "", hemoglobin: "", creatinine: "" },
    invoice: mapOcrFieldsToInvoiceForm(fields),
  };
}

function firstNonEmpty(...values: Array<string | undefined>): string {
  return values.find((value) => value && value.length > 0) ?? "";
}
