"use client";

import { useState } from "react";
import { toast } from "sonner";
import { enterpriseContractsAPI } from "@/lib/api/api";
import type { DataAccessConfig } from "@workspace/data-access";
import {
  type InternalEnterpriseContractInvoiceRow as EnterpriseContractInvoiceRow,
  type InternalEnterpriseContractRow as EnterpriseContractRow,
  fetchInternalEnterpriseContractInvoices,
} from "@workspace/data-access/internal";
import {
  formatEvaluateTrueUpResult,
  formatPrepayResult,
  formatSetupFeeResult,
  LOAD_INVOICES_ERROR,
  MINIMUM_SETUP_FEE_INR,
  PREPAY_ERROR,
  SETUP_FEE_INVOICE_ERROR,
  SETUP_FEE_MINIMUM_ERROR,
  TRUEUP_ERROR,
} from "./enterprise-contracts-helpers";

export function useContractInvoicesDialog(
  load: () => Promise<void>,
  setError: (e: string | null) => void,
  setBusy: (b: boolean) => void,
  fetcher: DataAccessConfig["fetcher"],
) {
  const [invoicesOpen, setInvoicesOpen] = useState(false);
  const [invoices, setInvoices] = useState<EnterpriseContractInvoiceRow[]>([]);

  const showInvoices = async (contractId: string) => {
    setInvoices([]);
    setInvoicesOpen(true);
    try {
      setInvoices(
        await fetchInternalEnterpriseContractInvoices(fetcher, contractId),
      );
    } catch {
      setError(LOAD_INVOICES_ERROR);
    }
  };

  const generatePrepay = async (contractId: string) => {
    setBusy(true);
    setError(null);
    try {
      toast.success(
        formatPrepayResult(
          await enterpriseContractsAPI.generateAnnualPrepayInvoice(contractId),
        ),
      );
      await load();
    } catch {
      setError(PREPAY_ERROR);
    } finally {
      setBusy(false);
    }
  };

  const generateSetupFeeInvoice = async (row: EnterpriseContractRow) => {
    if (row.setupFeeCents < MINIMUM_SETUP_FEE_INR * 100) {
      setError(SETUP_FEE_MINIMUM_ERROR);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      toast.success(
        formatSetupFeeResult(
          await enterpriseContractsAPI.generateSetupFeeInvoice(row.id),
        ),
      );
      await load();
    } catch {
      setError(SETUP_FEE_INVOICE_ERROR);
    } finally {
      setBusy(false);
    }
  };

  const evaluateTrueUp = async (contractId: string) => {
    setBusy(true);
    setError(null);
    try {
      toast.success(
        formatEvaluateTrueUpResult(
          await enterpriseContractsAPI.evaluateTrueUp(contractId),
        ),
      );
      await load();
    } catch {
      setError(TRUEUP_ERROR);
    } finally {
      setBusy(false);
    }
  };

  return {
    invoicesOpen,
    setInvoicesOpen,
    invoices,
    showInvoices,
    generatePrepay,
    generateSetupFeeInvoice,
    evaluateTrueUp,
  };
}
