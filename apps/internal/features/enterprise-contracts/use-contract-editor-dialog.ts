"use client";

import { useState } from "react";
import { enterpriseContractsAPI } from "@/lib/api/api";
import type { InternalEnterpriseContractRow as EnterpriseContractRow } from "@workspace/data-access/internal";
import {
  BLANK_ENTERPRISE_CONTRACT_FORM,
  buildEnterpriseContractUpsertPayload,
  type ContractFormState,
  ENTERPRISE_QUOTE_PRESETS,
  enterpriseContractRowToForm,
  type EnterpriseQuotePresetKey,
  SAVE_CONTRACT_ERROR,
  validateContractForm,
} from "./enterprise-contracts-helpers";

export function useContractEditorDialog(
  load: () => Promise<void>,
  setError: (e: string | null) => void,
  setBusy: (b: boolean) => void,
) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState<ContractFormState>(
    BLANK_ENTERPRISE_CONTRACT_FORM,
  );
  const [editingContractId, setEditingContractId] = useState<string | null>(
    null,
  );

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
  };
}
