"use client";

import { useState } from "react";
import { toast } from "sonner";
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
} from "@workspace/data-access/internal";
import type { DataAccessConfig } from "@workspace/data-access";
import {
  ADD_CLINIC_ERROR,
  ADJUSTMENT_INVOICE_ERROR,
  BLANK_ENTERPRISE_CONTRACT_FORM,
  buildEnterpriseContractUpsertPayload,
  CANNOT_REMOVE_PRIMARY_CLINIC_ERROR,
  type ContractFormState,
  ENTERPRISE_QUOTE_PRESETS,
  enterpriseContractRowToForm,
  type EnterpriseQuotePresetKey,
  formatAdjustmentResult,
  formatEvaluateTrueUpResult,
  formatPrepayResult,
  formatSetupFeeResult,
  inrToCents,
  LOAD_ALERTS_ERROR,
  LOAD_ESTIMATE_ERROR,
  LOAD_INVOICES_ERROR,
  LOAD_REVISIONS_ERROR,
  MINIMUM_SETUP_FEE_INR,
  PREPAY_ERROR,
  REMOVE_CLINIC_ERROR,
  SAVE_CONTRACT_ERROR,
  SETUP_FEE_INVOICE_ERROR,
  SETUP_FEE_MINIMUM_ERROR,
  TRUEUP_ERROR,
  validateContractForm,
} from "./enterprise-contracts-helpers";

export function useEnterpriseContractDialogs(
  load: () => Promise<void>,
  setError: (e: string | null) => void,
  setBusy: (b: boolean) => void,
  fetcher: DataAccessConfig["fetcher"],
) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState<ContractFormState>(
    BLANK_ENTERPRISE_CONTRACT_FORM,
  );
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
  const [customBillOpen, setCustomBillOpen] = useState(false);
  const [customBillContract, setCustomBillContract] =
    useState<EnterpriseContractRow | null>(null);
  const [customBillLabel, setCustomBillLabel] = useState("");
  const [customBillAmountINR, setCustomBillAmountINR] = useState("");
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [alerts, setAlerts] = useState<EnterpriseTrueUpAlertRow[]>([]);

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
    setForm((f) => ({ ...f, ...ENTERPRISE_QUOTE_PRESETS[key] }));
  };

  const submit = async () => {
    const validationError = validateContractForm(form);
    if (validationError) {
      setError(validationError);
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
      setError(SAVE_CONTRACT_ERROR);
    } finally {
      setBusy(false);
    }
  };

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
      const u = await enterpriseContractsAPI.addMember(
        activeContract.id,
        newMemberClinicId.trim(),
      );
      setActiveContract(u);
      setNewMemberClinicId("");
      await load();
    } catch {
      setError(ADD_CLINIC_ERROR);
    } finally {
      setBusy(false);
    }
  };

  const removeMember = async (clinicId: string) => {
    if (!activeContract) return;
    if (clinicId === activeContract.primaryClinicId) {
      setError(CANNOT_REMOVE_PRIMARY_CLINIC_ERROR);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      setActiveContract(
        await enterpriseContractsAPI.removeMember(activeContract.id, clinicId),
      );
      await load();
    } catch {
      setError(REMOVE_CLINIC_ERROR);
    } finally {
      setBusy(false);
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

  const showAlerts = async (contractId: string) => {
    setAlerts([]);
    setAlertsOpen(true);
    try {
      setAlerts(
        await fetchInternalEnterpriseContractTrueUpAlerts(fetcher, contractId),
      );
    } catch {
      setError(LOAD_ALERTS_ERROR);
    }
  };

  return {
    editorOpen,
    setEditorOpen,
    editorMode,
    form,
    setForm,
    editingContractId,
    openCreate,
    openEdit,
    applyPreset,
    submit,
    estimateOpen,
    setEstimateOpen,
    estimate,
    estimateLoading,
    showEstimate,
    revisionsOpen,
    setRevisionsOpen,
    revisions,
    showRevisions,
    membersOpen,
    setMembersOpen,
    activeContract,
    newMemberClinicId,
    setNewMemberClinicId,
    addMember,
    removeMember,
    showMembers,
    invoicesOpen,
    setInvoicesOpen,
    invoices,
    showInvoices,
    customBillOpen,
    setCustomBillOpen,
    customBillContract,
    customBillLabel,
    setCustomBillLabel,
    customBillAmountINR,
    setCustomBillAmountINR,
    openCustomBill,
    submitCustomBill,
    alertsOpen,
    setAlertsOpen,
    alerts,
    showAlerts,
    generatePrepay,
    generateSetupFeeInvoice,
    evaluateTrueUp,
  };
}
