"use client";

import { useState } from "react";
import type { DataAccessConfig } from "@workspace/data-access";
import {
  type InternalEnterpriseContractEstimate as EnterpriseContractEstimate,
  fetchInternalEnterpriseContractEstimate,
} from "@workspace/data-access/internal";
import { LOAD_ESTIMATE_ERROR } from "./enterprise-contracts-helpers";

export function useContractEstimateDialog(
  setError: (e: string | null) => void,
  fetcher: DataAccessConfig["fetcher"],
) {
  const [estimateOpen, setEstimateOpen] = useState(false);
  const [estimate, setEstimate] = useState<EnterpriseContractEstimate | null>(
    null,
  );
  const [estimateLoading, setEstimateLoading] = useState(false);

  const showEstimate = async (contractId: string) => {
    setEstimate(null);
    setEstimateOpen(true);
    setEstimateLoading(true);
    try {
      setEstimate(
        await fetchInternalEnterpriseContractEstimate(fetcher, contractId),
      );
    } catch {
      setError(LOAD_ESTIMATE_ERROR);
    } finally {
      setEstimateLoading(false);
    }
  };

  return {
    estimateOpen,
    setEstimateOpen,
    estimate,
    estimateLoading,
    showEstimate,
  };
}
