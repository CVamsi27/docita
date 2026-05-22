"use client";

import { useMemo, useState } from "react";
import { enterpriseContractsAPI } from "@/lib/api/api";
import {
  type InternalEnterpriseContractEstimate as EnterpriseContractEstimate,
  type InternalEnterpriseContractInvoiceRow as EnterpriseContractInvoiceRow,
  type InternalEnterpriseContractRevisionRow as EnterpriseContractRevisionRow,
  type InternalEnterpriseContractRow as EnterpriseContractRow,
  type InternalEnterpriseTrueUpAlertRow as EnterpriseTrueUpAlertRow,
  fetchInternalEnterpriseContractEstimate,
  fetchInternalEnterpriseContractInvoices,
  fetchInternalEnterpriseContractRevisions,
  fetchInternalEnterpriseContractTrueUpAlerts,
  useInternalEnterpriseContracts,
} from "@workspace/data-access/internal";
import { useDataAccessFetcher } from "@workspace/data-access";
import { useAuth } from "@/lib/auth/auth";
import { getUserFacingErrorMessage } from "@workspace/utils";
import type { DataStateStatus } from "@workspace/ui/components/data-display/data-state";
import {
  BLANK_ENTERPRISE_CONTRACT_FORM,
  buildEnterpriseContractUpsertPayload,
  type ContractFormState,
  ENTERPRISE_QUOTE_PRESETS,
  enterpriseContractRowToForm,
  type EnterpriseQuotePresetKey,
} from "./enterprise-contracts-helpers";

export function useEnterpriseContractsPage() {
  const { token } = useAuth();
  const fetcher = useDataAccessFetcher();
  const contractsQuery = useInternalEnterpriseContracts(token);
  const rows = useMemo(() => contractsQuery.data ?? [], [contractsQuery.data]);
  const loading = contractsQuery.isLoading;
  const contractsLoadError = contractsQuery.isError
    ? getUserFacingErrorMessage(contractsQuery.error, {
        context: "load",
        fallback:
          "We could not load enterprise contracts. Please try again.",
      })
    : null;
  const contractsTableStatus: DataStateStatus = loading
    ? "loading"
    : contractsLoadError
      ? "error"
      : rows.length === 0
        ? "empty"
        : "success";
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState<ContractFormState>(BLANK_ENTERPRISE_CONTRACT_FORM);
  const [editingContractId, setEditingContractId] = useState<string | null>(
    null,
  );

  const [estimateOpen, setEstimateOpen] = useState(false);
  const [estimate, setEstimate] = useState<EnterpriseContractEstimate | null>(
    null,
  );
  const [estimateLoading, setEstimateLoading] = useState(false);

  const [revisionsOpen, setRevisionsOpen] = useState(false);
  const [revisions, setRevisions] = useState<EnterpriseContractRevisionRow[]>(
    [],
  );

  const [membersOpen, setMembersOpen] = useState(false);
  const [activeContract, setActiveContract] =
    useState<EnterpriseContractRow | null>(null);
  const [newMemberClinicId, setNewMemberClinicId] = useState("");

  const [invoicesOpen, setInvoicesOpen] = useState(false);
  const [invoices, setInvoices] = useState<EnterpriseContractInvoiceRow[]>([]);

  const [alertsOpen, setAlertsOpen] = useState(false);
  const [alerts, setAlerts] = useState<EnterpriseTrueUpAlertRow[]>([]);

  const load = async () => {
    setRefreshing(true);
    setError(null);
    const result = await contractsQuery.refetch();
    if (result.isError) {
      setError("We couldn't load enterprise contracts. Please try again.");
    }
    setRefreshing(false);
  };

  const openCreate = () => {
    setEditorMode("create");
    setEditingContractId(null);
    setForm(BLANK_ENTERPRISE_CONTRACT_FORM);
    setEditorOpen(true);
  };

  const openEdit = (row: EnterpriseContractRow) => {
    setEditorMode("edit");
    setEditingContractId(row.id);
    setForm(enterpriseContractRowToForm(row));
    setEditorOpen(true);
  };

  const applyPreset = (key: EnterpriseQuotePresetKey) => {
    const p = ENTERPRISE_QUOTE_PRESETS[key];
    setForm((f) => ({ ...f, ...p }));
  };

  const submit = async () => {
    if (
      !form.primaryClinicId ||
      !form.contractNumber ||
      !form.startDate ||
      !form.endDate
    ) {
      setError(
        "primaryClinicId, contractNumber, start and end dates are required",
      );
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await enterpriseContractsAPI.upsert(
        form.primaryClinicId,
        buildEnterpriseContractUpsertPayload(form),
      );
      setEditorOpen(false);
      await load();
    } catch {
      setError("We couldn't save the contract. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const showEstimate = async (contractId: string) => {
    setEstimate(null);
    setEstimateOpen(true);
    setEstimateLoading(true);
    try {
      const est = await fetchInternalEnterpriseContractEstimate(
        fetcher,
        contractId,
      );
      setEstimate(est);
    } catch {
      setError("We couldn't load the estimate. Please try again.");
    } finally {
      setEstimateLoading(false);
    }
  };

  const showRevisions = async (contractId: string) => {
    setRevisions([]);
    setRevisionsOpen(true);
    try {
      const list = await fetchInternalEnterpriseContractRevisions(
        fetcher,
        contractId,
      );
      setRevisions(list);
    } catch {
      setError("We couldn't load revisions. Please try again.");
    }
  };

  const showMembers = (row: EnterpriseContractRow) => {
    setActiveContract(row);
    setNewMemberClinicId("");
    setMembersOpen(true);
  };

  const addMember = async () => {
    if (!activeContract || !newMemberClinicId.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await enterpriseContractsAPI.addMember(
        activeContract.id,
        newMemberClinicId.trim(),
      );
      setActiveContract(updated);
      setNewMemberClinicId("");
      await load();
    } catch {
      setError("We couldn't add that clinic. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const removeMember = async (clinicId: string) => {
    if (!activeContract) return;
    if (clinicId === activeContract.primaryClinicId) {
      setError("Cannot remove the primary clinic");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const updated = await enterpriseContractsAPI.removeMember(
        activeContract.id,
        clinicId,
      );
      setActiveContract(updated);
      await load();
    } catch {
      setError("We couldn't remove that clinic. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const generatePrepay = async (contractId: string) => {
    if (
      !confirm(
        "Generate annual prepay invoice for this contract? This creates a SubscriptionPayment for the 12-month commitment minus any discount.",
      )
    )
      return;
    setBusy(true);
    setError(null);
    try {
      const inv =
        await enterpriseContractsAPI.generateAnnualPrepayInvoice(contractId);
      alert(
        `Prepay invoice generated: ${inv.id}\nAmount: ₹${(inv.amountCents / 100).toFixed(2)}\nDiscount: ${inv.discountPercent}%`,
      );
      await load();
    } catch {
      setError("We couldn't generate the prepay invoice. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const showInvoices = async (contractId: string) => {
    setInvoices([]);
    setInvoicesOpen(true);
    try {
      const list = await fetchInternalEnterpriseContractInvoices(
        fetcher,
        contractId,
      );
      setInvoices(list);
    } catch {
      setError("We couldn't load invoices. Please try again.");
    }
  };

  const evaluateTrueUp = async (contractId: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await enterpriseContractsAPI.evaluateTrueUp(contractId);
      alert(
        res.alerted
          ? `True-up alert raised: ${res.observedPercent}% of commit (recipients emailed).`
          : `No alert: usage at ${res.observedPercent}% (below threshold or already alerted this month).`,
      );
      await load();
    } catch {
      setError("We couldn't evaluate true-up. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const showAlerts = async (contractId: string) => {
    setAlerts([]);
    setAlertsOpen(true);
    try {
      const list = await fetchInternalEnterpriseContractTrueUpAlerts(
        fetcher,
        contractId,
      );
      setAlerts(list);
    } catch {
      setError("We couldn't load alerts. Please try again.");
    }
  };

  const totals = useMemo(() => {
    const active = rows.filter((r) => r.status === "ACTIVE");
    const platformFeeMrr = active.reduce(
      (sum, r) => sum + r.platformFeeCents,
      0,
    );
    return {
      total: rows.length,
      active: active.length,
      draft: rows.filter((r) => r.status === "DRAFT").length,
      mrrCents: platformFeeMrr,
    };
  }, [rows]);

  return {
    rows,
    contractsTableStatus,
    contractsLoadError,
    contractsQuery,
    refreshing,
    error,
    busy,
    totals,
    load,
    openCreate,
    openEdit,
    editorOpen,
    setEditorOpen,
    editorMode,
    form,
    setForm,
    editingContractId,
    applyPreset,
    submit,
    estimateOpen,
    setEstimateOpen,
    estimate,
    estimateLoading,
    revisionsOpen,
    setRevisionsOpen,
    revisions,
    membersOpen,
    setMembersOpen,
    activeContract,
    newMemberClinicId,
    setNewMemberClinicId,
    addMember,
    removeMember,
    invoicesOpen,
    setInvoicesOpen,
    invoices,
    alertsOpen,
    setAlertsOpen,
    alerts,
    showEstimate,
    showRevisions,
    showMembers,
    generatePrepay,
    showInvoices,
    evaluateTrueUp,
    showAlerts,
  };
}

export type EnterpriseContractsPageState = ReturnType<
  typeof useEnterpriseContractsPage
>;
