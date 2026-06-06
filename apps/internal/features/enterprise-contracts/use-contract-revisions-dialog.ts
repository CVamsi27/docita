"use client";

import { useState } from "react";
import type { DataAccessConfig } from "@workspace/data-access";
import {
  type InternalEnterpriseContractRevisionRow as EnterpriseContractRevisionRow,
  fetchInternalEnterpriseContractRevisions,
} from "@workspace/data-access/internal";
import { LOAD_REVISIONS_ERROR } from "./enterprise-contracts-helpers";

export function useContractRevisionsDialog(
  setError: (e: string | null) => void,
  fetcher: DataAccessConfig["fetcher"],
) {
  const [revisionsOpen, setRevisionsOpen] = useState(false);
  const [revisions, setRevisions] = useState<EnterpriseContractRevisionRow[]>(
    [],
  );

  const showRevisions = async (contractId: string) => {
    setRevisions([]);
    setRevisionsOpen(true);
    try {
      setRevisions(
        await fetchInternalEnterpriseContractRevisions(fetcher, contractId),
      );
    } catch {
      setError(LOAD_REVISIONS_ERROR);
    }
  };

  return {
    revisionsOpen,
    setRevisionsOpen,
    revisions,
    showRevisions,
  };
}
