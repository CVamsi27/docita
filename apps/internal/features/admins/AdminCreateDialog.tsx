"use client";

import { Plus } from "lucide-react";
import { Dialog, DialogContent } from "@workspace/ui/components/overlay/dialog";
import type { CreateForm } from "./admin-helpers";
import {
  AdminDialogActions,
  AdminDialogHeader,
  AdminEmailField,
  AdminNameField,
  AdminPasswordField,
  AdminPhoneNumberField,
  AdminTypeSelect,
} from "./admin-dialog-shell";

interface AdminCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: CreateForm;
  onFormChange: (form: CreateForm) => void;
  onCreate: () => void;
  saving: boolean;
}

export function AdminCreateDialog({
  open,
  onOpenChange,
  form,
  onFormChange,
  onCreate,
  saving,
}: AdminCreateDialogProps) {
  const resetForm = () =>
    onFormChange({
      name: "",
      email: "",
      password: "",
      phoneNumber: "",
      adminType: "admin",
    });

  const handleFieldChange = <K extends keyof CreateForm>(
    key: K,
    value: CreateForm[K],
  ) => onFormChange({ ...form, [key]: value });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <AdminDialogHeader
          icon={<Plus className="h-5 w-5" />}
          title="Create New Admin"
          description="Add a new administrator to the selected clinic"
        />
        <div className="space-y-4">
          <AdminNameField
            id="name"
            value={form.name}
            onChange={(v) => handleFieldChange("name", v)}
          />
          <AdminEmailField
            id="email"
            value={form.email}
            onChange={(v) => handleFieldChange("email", v)}
          />
          <AdminPasswordField
            id="password"
            value={form.password}
            onChange={(v) => handleFieldChange("password", v)}
          />
          <AdminPhoneNumberField
            id="phoneNumber"
            value={form.phoneNumber}
            onChange={(v) => handleFieldChange("phoneNumber", v)}
          />
          <AdminTypeSelect
            value={form.adminType}
            onChange={(v) => handleFieldChange("adminType", v as CreateForm["adminType"])}
            showIcons
            helperText={
              form.adminType === "admin_doctor"
                ? "Admin Doctor can manage clinic operations and provide clinical care"
                : "Clinic Admin manages clinic operations and staff"
            }
          />
          <AdminDialogActions
            onCancel={() => {
              resetForm();
              onOpenChange(false);
            }}
            onAction={onCreate}
            actionLabel="Create Admin"
            saving={saving}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
