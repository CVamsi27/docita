"use client";

import { useState } from "react";
import { toast } from "sonner";
import { enterpriseContractsAPI } from "@/lib/api/api";
import type { InternalEnterpriseContractRow as EnterpriseContractRow } from "@workspace/data-access/internal";
import {
  ADJUSTMENT_INVOICE_ERROR,
  formatAdjustmentResult,
  inrToCents,
} from "./enterprise-contracts-helpers";

export function useContractCustomBillDialog(
  load: () => Promise<void>,
  setError: (e: string | null) => void,
  setBusy: (b: boolean) => void,
) {
  const [customBillOpen, setCustomBillOpen] = useState(false);
  const [customBillContract, setCustomBillContract] =
    useState<EnterpriseContractRow | null>(null);
  const [customBillLabel, setCustomBillLabel] = useState("");
  const [customBillAmountINR, setCustomBillAmountINR] = useState("");

  const openCustomBill = (row: EnterpriseContractRow) => {
    setCustomBillContract(row);
    setCustomBillLabel("");
    setCustomBillAmountINR("");
    setCustomBillOpen(true);
  };

  const submitCustomBill = async () => {
    if (!customBillContract) return;
    const label = customBillLabel.trim();
    const amountCents = inrToCents(customBillAmountINR);
    if (!label || amountCents <= 0) {
      setError("Custom bill label and amount are required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      toast.success(
        formatAdjustmentResult(
          await enterpriseContractsAPI.generateAdjustmentInvoice(
            customBillContract.id,
            { label, amountCents },
          ),
        ),
      );
      setCustomBillOpen(false);
      await load();
    } catch {
      setError(ADJUSTMENT_INVOICE_ERROR);
    } finally {
      setBusy(false);
    }
  };

  return {
    customBillOpen,
    setCustomBillOpen,
    customBillContract,
    customBillLabel,
    setCustomBillLabel,
    customBillAmountINR,
    setCustomBillAmountINR,
    openCustomBill,
    submitCustomBill,
  };
}
