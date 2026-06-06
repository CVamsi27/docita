"use client";

import type { DataAccessConfig } from "@workspace/data-access";
import { useContractEditorDialog } from "./use-contract-editor-dialog";
import { useContractEstimateDialog } from "./use-contract-estimate-dialog";
import { useContractRevisionsDialog } from "./use-contract-revisions-dialog";
import { useContractMembersDialog } from "./use-contract-members-dialog";
import { useContractInvoicesDialog } from "./use-contract-invoices-dialog";
import { useContractCustomBillDialog } from "./use-contract-custom-bill-dialog";
import { useContractAlertsDialog } from "./use-contract-alerts-dialog";

export function useEnterpriseContractDialogs(
  load: () => Promise<void>,
  setError: (e: string | null) => void,
  setBusy: (b: boolean) => void,
  fetcher: DataAccessConfig["fetcher"],
) {
  return {
    ...useContractEditorDialog(load, setError, setBusy),
    ...useContractEstimateDialog(setError, fetcher),
    ...useContractRevisionsDialog(setError, fetcher),
    ...useContractMembersDialog(load, setError, setBusy),
    ...useContractInvoicesDialog(load, setError, setBusy, fetcher),
    ...useContractCustomBillDialog(load, setError, setBusy),
    ...useContractAlertsDialog(setError, fetcher),
  };
}
