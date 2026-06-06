"use client";

import { useState } from "react";
import { enterpriseContractsAPI } from "@/lib/api/api";
import type { InternalEnterpriseContractRow as EnterpriseContractRow } from "@workspace/data-access/internal";
import {
  ADD_CLINIC_ERROR,
  CANNOT_REMOVE_PRIMARY_CLINIC_ERROR,
  REMOVE_CLINIC_ERROR,
} from "./enterprise-contracts-helpers";

export function useContractMembersDialog(
  load: () => Promise<void>,
  setError: (e: string | null) => void,
  setBusy: (b: boolean) => void,
) {
  const [membersOpen, setMembersOpen] = useState(false);
  const [activeContract, setActiveContract] =
    useState<EnterpriseContractRow | null>(null);
  const [newMemberClinicId, setNewMemberClinicId] = useState("");

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

  return {
    membersOpen,
    setMembersOpen,
    activeContract,
    newMemberClinicId,
    setNewMemberClinicId,
    addMember,
    removeMember,
    showMembers,
  };
}
