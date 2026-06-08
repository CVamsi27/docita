"use client";

import { Feature, type Document, type DocumentContractResponse, ListDocumentsContractQuery } from "@workspace/types";
import { useAPIQuery } from "../../core/use-api-query";
import { queryKeys } from "../../lib/query-keys-clinician";
import { withQueryString } from "../../lib/query-string";
import { useDataAccessContext } from "../../provider/hooks";

export const useDocuments = (filters?: ListDocumentsContractQuery) => {
  const docsOk = useDataAccessContext().isTierFeatureEnabled(
    Feature.DOCUMENT_ARCHIVAL,
  );
  return useAPIQuery<DocumentContractResponse[]>(
    queryKeys.clinical.documents.list(filters),
    withQueryString("/documents", filters),
    { enabled: docsOk },
  );
};

export const useDocument = (id: string) => {
  const docsOk = useDataAccessContext().isTierFeatureEnabled(
    Feature.DOCUMENT_ARCHIVAL,
  );
  return useAPIQuery<Document>(
    queryKeys.clinical.documents.detail(id),
    `/documents/${id}`,
    {
      enabled: docsOk && id.length > 0,
    },
  );
};
