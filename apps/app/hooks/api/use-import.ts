import { useAPIMutation, useAPIQuery } from "../../lib/api-core";

export const useProcessOCR = () =>
  useAPIMutation<
    {
      text?: string;
      documentType?: "PRESCRIPTION" | "CASE_SHEET" | "LAB_REPORT" | "GENERAL";
      confidence?: number;
      fields?: {
        firstName?: string;
        lastName?: string;
        age?: string;
        gender?: string;
        phoneNumber?: string;
        email?: string;
        bloodType?: string;
        diagnosis?: string;
        symptoms?: string[];
        allergies?: string[];
        medicalHistory?: string[];
        vitals?: {
          bp?: string;
          temp?: string;
          pulse?: string;
          respiratoryRate?: string;
          spO2?: string;
          glucose?: string;
        };
        medications?: Array<{
          name: string;
          dosage: string;
          frequency: string;
          route?: string;
          duration?: string;
        }>;
        fieldConfidence?: Record<string, number>;
      };
      suggestedCorrections?: Record<string, string>;
      firstName?: string;
      lastName?: string;
      age?: string;
      gender?: string;
      phoneNumber?: string;
      diagnosis?: string;
      vitals?: { bp?: string; temp?: string; pulse?: string };
    },
    FormData
  >("/imports/ocr/process", "POST");

export const useBulkImportTemplate = (entityType: string) =>
  useAPIQuery<{ template: string; format: string }>(
    ["import-template", entityType],
    `/imports/template?entityType=${entityType}`,
    { staleTime: 1000 * 60 * 60 },
  );

export const useBulkImport = () =>
  useAPIMutation<
    { jobId: string; status: string; totalRows: number },
    { entityType: string; fileName: string; fileBuffer: Buffer }
  >("/imports/bulk", "POST");
