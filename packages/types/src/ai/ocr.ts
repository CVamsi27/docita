import { z } from "zod";
import { jsonObjectSchema } from "../shared/json-schema";
import { FieldConfidenceConfig, OcrRawData } from "./ai-types";

/** Prisma `OcrDocument.extractedData`. */
export const ocrExtractedDataJsonSchema = jsonObjectSchema;

/** Prisma `OcrDocument.fieldConfidenceScores`. */
export const ocrFieldConfidenceScoresJsonSchema = z.record(z.number());

/** Prisma `OcrDocument.suggestedCorrections`. */
export const ocrSuggestedCorrectionsJsonSchema = jsonObjectSchema;

/** Prisma `OcrDocument.corrections`. */
export const ocrCorrectionsJsonSchema = jsonObjectSchema;

export interface ExtractedText {
  text: string;
  confidence: number;
  documentType: "PRESCRIPTION" | "CASE_SHEET" | "LAB_REPORT" | "GENERAL";
}

export interface OCRMedication {
  name: string;
  dosage: string;
  frequency: string;
  route: string;
  duration: string;
}

export interface OCRVitals {
  bp: string;
  temp: string;
  pulse: string;
  respiratoryRate: string;
  spO2: string;
  glucose: string;
}

export interface OCRLabValues {
  glucose: string;
  hemoglobin: string;
  creatinine: string;
}

export interface OCRInvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface EmergencyContact {
  name: string;
  phoneNumber: string;
  relation: string;
}

export interface ParsedMedicalFields {
  firstName: string;
  lastName: string;
  mrn: string;
  preferredName: string;
  pronouns: string;
  address: string;
  preferredLanguage: string;
  age: string;
  gender: string;
  phoneNumber: string;
  email: string;
  bloodType: string;
  emergencyContact: EmergencyContact | null;

  dateOfBirth: string;
  visitDate: string;
  invoiceDate: string;
  admissionDate: string;

  clinicName: string;
  doctorName: string;

  diagnosis: string;
  symptoms: string[];
  allergies: string[];
  medicalHistory: string[];
  medications: OCRMedication[];
  vitals: OCRVitals;
  labValues: OCRLabValues;

  invoice: {
    total: number | null;
    tax: number | null;
    discount: number | null;
    subtotal: number | null;
    items: OCRInvoiceItem[];
  };
}

export type { OcrRawData, FieldConfidenceConfig };
