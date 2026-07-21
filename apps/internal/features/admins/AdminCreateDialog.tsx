// check-as-cast-density: allow-file — React Hook Form generic field name requires as Path
"use client";

import { Plus } from "lucide-react";
import { Dialog, DialogContent } from "@workspace/ui/components/overlay/dialog";
import type { CreateForm } from "./admin-helpers";
import { AdminDialogFormFields } from "./admin-dialog-form-fields";

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <AdminDialogFormFields
          headerIcon={<Plus className="h-5 w-5" />}
          headerTitle="Create New Admin"
          headerDescription="Add a new administrator to the selected clinic"
          form={form}
          onFieldChange={(key, value) => onFormChange({ ...form, [key]: value as never })}
          showPassword
          onCancel={() => {
            resetForm();
            onOpenChange(false);
          }}
          onAction={onCreate}
          actionLabel="Create Admin"
          saving={saving}
          typeSelectHelperText={
            form.adminType === "admin_doctor"
              ? "Admin Doctor can manage clinic operations and provide clinical care"
              : "Clinic Admin manages clinic operations and staff"
          }
        />
      </DialogContent>
    </Dialog>
  );
}
