export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
}

import type { OCRLabValues } from "@workspace/types";

export type LabValues = OCRLabValues;

export interface Vitals {
  bp: string;
  pulse: string;
  temp: string;
  spO2: string;
  respiratoryRate: string;
  glucose: string;
}

export interface OCRInvoiceLineForm {
  description: string;
  quantity: string;
  unitPrice: string;
  total: string;
}

export interface OCRInvoiceForm {
  saveAsPending: boolean;
  grandTotal: string;
  subtotal: string;
  taxTotal: string;
  items: OCRInvoiceLineForm[];
}

export interface OCRFormData {
  firstName: string;
  lastName: string;
  age: string;
  gender: string;
  dateOfBirth: string;
  phoneNumber: string;
  email: string;
  address: string;
  bloodType: string;
  diagnosis: string;
  symptoms: string[];
  allergies: string[];
  medicalHistory: string[];
  medications: Medication[];
  labValues: LabValues;
  vitals: Vitals;
  invoice: OCRInvoiceForm;
}
