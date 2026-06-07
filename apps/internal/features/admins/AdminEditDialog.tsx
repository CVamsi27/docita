// check-as-cast-density: allow-file — React Hook Form generic field name requires as Path
"use client";

import { Edit2 } from "lucide-react";
import { Dialog, DialogContent } from "@workspace/ui/components/overlay/dialog";
import type { EditForm } from "./admin-helpers";
import {
  AdminDialogActions,
  AdminDialogHeader,
  AdminEmailField,
  AdminNameField,
  AdminPhoneNumberField,
  AdminTypeSelect,
} from "./admin-dialog-shell";

interface AdminEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: EditForm;
  onFormChange: (form: EditForm) => void;
  onSave: () => void;
  saving: boolean;
}

export function AdminEditDialog({
  open,
  onOpenChange,
  form,
  onFormChange,
  onSave,
  saving,
}: AdminEditDialogProps) {
  const handleFieldChange = <K extends keyof EditForm>(
    key: K,
    value: EditForm[K],
  ) => onFormChange({ ...form, [key]: value });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <AdminDialogHeader
          icon={<Edit2 className="h-5 w-5" />}
          title="Edit Admin"
          description="Update admin information"
        />
        <div className="space-y-4">
          <AdminNameField
            id="edit-name"
            value={form.name}
            onChange={(v) => handleFieldChange("name", v)}
          />
          <AdminEmailField
            id="edit-email"
            value={form.email}
            onChange={(v) => handleFieldChange("email", v)}
          />
          <AdminPhoneNumberField
            id="edit-phoneNumber"
            value={form.phoneNumber}
            onChange={(v) => handleFieldChange("phoneNumber", v)}
          />
          <AdminTypeSelect
            value={form.adminType}
            onChange={(v) => handleFieldChange("adminType", v as EditForm["adminType"])}
          />
          <AdminDialogActions
            onCancel={() => onOpenChange(false)}
            onAction={onSave}
            actionLabel="Save Changes"
            saving={saving}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
