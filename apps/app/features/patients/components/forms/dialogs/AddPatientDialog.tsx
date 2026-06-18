"use client";

import { FC } from "react";
import { FormDialog } from "@workspace/ui/components/form/form-dialog";
import { AddPatientDialogForm } from "./add-patient-dialog-form";
import { useAddPatientDialog } from "./use-add-patient-dialog";

interface AddPatientDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onPatientAdded?: () => void;
}

export const AddPatientDialog: FC<AddPatientDialogProps> = ({
  open = false,
  onOpenChange,
  onPatientAdded,
}) => {
  const dialog = useAddPatientDialog({ onPatientAdded, onOpenChange });

  return (
    <FormDialog
      open={open}
      onOpenChange={dialog.handleClose}
      title="Add New Patient"
      description="Enter the patient's details to create their record"
    >
      <AddPatientDialogForm
        form={dialog.form}
        dpdpAccepted={dialog.dpdpAccepted}
        isPending={dialog.isPending}
        abhaAddress={dialog.abhaAddress}
        abhaStatus={dialog.abhaStatus}
        createdPatientId={dialog.createdPatientId}
        onVerifyAbha={dialog.handleVerifyCreatedAbha}
        onSubmit={dialog.handleSubmit}
        onCancel={() => dialog.handleClose(false)}
      />
    </FormDialog>
  );
};
