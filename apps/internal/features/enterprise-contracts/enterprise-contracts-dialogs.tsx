"use client";

import { EnterpriseContractsAlertsDialog } from "@/features/enterprise-contracts/enterprise-contracts-alerts-dialog";
import { EnterpriseContractsCustomBillDialog } from "@/features/enterprise-contracts/enterprise-contracts-custom-bill-dialog";
import { EnterpriseContractsEditorDialog } from "@/features/enterprise-contracts/enterprise-contracts-editor-dialog";
import { EnterpriseContractsEstimateDialog } from "@/features/enterprise-contracts/enterprise-contracts-estimate-dialog";
import { EnterpriseContractsInvoicesDialog } from "@/features/enterprise-contracts/enterprise-contracts-invoices-dialog";
import { EnterpriseContractsMembersDialog } from "@/features/enterprise-contracts/enterprise-contracts-members-dialog";
import { EnterpriseContractsRevisionsDialog } from "@/features/enterprise-contracts/enterprise-contracts-revisions-dialog";
import type { EnterpriseContractsPageState } from "@/features/enterprise-contracts/use-enterprise-contracts-page";

export type EnterpriseContractsDialogsProps = Pick<
  EnterpriseContractsPageState,
  | "editorOpen"
  | "setEditorOpen"
  | "editorMode"
  | "form"
  | "setForm"
  | "editingContractId"
  | "applyPreset"
  | "submit"
  | "busy"
  | "membersOpen"
  | "setMembersOpen"
  | "activeContract"
  | "newMemberClinicId"
  | "setNewMemberClinicId"
  | "addMember"
  | "removeMember"
  | "estimateOpen"
  | "setEstimateOpen"
  | "estimate"
  | "estimateLoading"
  | "invoicesOpen"
  | "setInvoicesOpen"
  | "invoices"
  | "customBillOpen"
  | "setCustomBillOpen"
  | "customBillContract"
  | "customBillLabel"
  | "setCustomBillLabel"
  | "customBillAmountINR"
  | "setCustomBillAmountINR"
  | "submitCustomBill"
  | "alertsOpen"
  | "setAlertsOpen"
  | "alerts"
  | "revisionsOpen"
  | "setRevisionsOpen"
  | "revisions"
>;
export function EnterpriseContractsDialogs(
  state: EnterpriseContractsDialogsProps,
) {
  return (
    <>
      <EnterpriseContractsEditorDialog
        editorOpen={state.editorOpen}
        setEditorOpen={state.setEditorOpen}
        editorMode={state.editorMode}
        form={state.form}
        setForm={state.setForm}
        editingContractId={state.editingContractId}
        applyPreset={state.applyPreset}
        submit={state.submit}
        busy={state.busy}
      />
      <EnterpriseContractsMembersDialog
        membersOpen={state.membersOpen}
        setMembersOpen={state.setMembersOpen}
        activeContract={state.activeContract}
        newMemberClinicId={state.newMemberClinicId}
        setNewMemberClinicId={state.setNewMemberClinicId}
        addMember={state.addMember}
        removeMember={state.removeMember}
        busy={state.busy}
      />
      <EnterpriseContractsEstimateDialog
        estimateOpen={state.estimateOpen}
        setEstimateOpen={state.setEstimateOpen}
        estimate={state.estimate}
        estimateLoading={state.estimateLoading}
      />
      <EnterpriseContractsInvoicesDialog
        invoicesOpen={state.invoicesOpen}
        setInvoicesOpen={state.setInvoicesOpen}
        invoices={state.invoices}
      />
      <EnterpriseContractsCustomBillDialog
        customBillOpen={state.customBillOpen}
        setCustomBillOpen={state.setCustomBillOpen}
        customBillContract={state.customBillContract}
        customBillLabel={state.customBillLabel}
        setCustomBillLabel={state.setCustomBillLabel}
        customBillAmountINR={state.customBillAmountINR}
        setCustomBillAmountINR={state.setCustomBillAmountINR}
        submitCustomBill={state.submitCustomBill}
        busy={state.busy}
      />
      <EnterpriseContractsAlertsDialog
        alertsOpen={state.alertsOpen}
        setAlertsOpen={state.setAlertsOpen}
        alerts={state.alerts}
      />
      <EnterpriseContractsRevisionsDialog
        revisionsOpen={state.revisionsOpen}
        setRevisionsOpen={state.setRevisionsOpen}
        revisions={state.revisions}
      />
    </>
  );
}