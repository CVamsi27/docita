"use client";

import { Feature } from "@workspace/types";
import { useAPIQuery } from "../../core/use-api-query";
import { useAPIMutation } from "../../core/use-api-mutation";
import { queryKeys } from "../../lib/query-keys-clinician";
import { withQueryString } from "../../lib/query-string";
import { useDataAccessContext } from "../../provider/hooks";

/**
 * `/medical-documents` is a separate domain from `/documents` (general uploads):
 * sign/revoke workflow for clinical certificates and notes. Type lives here
 * since the backend hasn't published a Zod schema for it yet.
 */
export interface MedicalDocument {
  id: string;
  type: string;
  title: string;
  status: string;
  createdAt: string;
  signedAt?: string;
  validFrom?: string;
  validUntil?: string;
  pdfUrl?: string | null;
}

export interface CreateMedicalDocumentInput {
  type: string;
  patientId: string;
  appointmentId?: string;
  title: string;
  content: Record<string, unknown>;
  doctorId: string;
  pdfUrl?: string;
}

export const useMedicalDocuments = (patientId: string) => {
  const docsOk = useDataAccessContext().isTierFeatureEnabled(
    Feature.DOCUMENT_ARCHIVAL,
  );
  return useAPIQuery<MedicalDocument[]>(
    queryKeys.clinical.medicalDocuments.byPatient(patientId),
    withQueryString("/medical-documents", { patientId }),
    { enabled: docsOk && patientId.length > 0 },
  );
};

export const useSignMedicalDocument = () =>
  useAPIMutation<MedicalDocument, string>(
    (id) => `/medical-documents/${id}/sign`,
    "PATCH",
    {
      invalidateKeys: [queryKeys.clinical.medicalDocuments.all()],
      body: () => ({}),
    },
  );

export const useRevokeMedicalDocument = () =>
  useAPIMutation<MedicalDocument, string>(
    (id) => `/medical-documents/${id}/revoke`,
    "PATCH",
    {
      invalidateKeys: [queryKeys.clinical.medicalDocuments.all()],
      body: () => ({}),
    },
  );

export const useCreateMedicalDocument = () =>
  useAPIMutation<MedicalDocument, CreateMedicalDocumentInput>(
    "/medical-documents",
    "POST",
    { invalidateKeys: [queryKeys.clinical.medicalDocuments.all()] },
  );
