// check-as-cast-density: allow-file — React Hook Form generic field name requires as Path
"use client";

// jscpd:ignore-start
import { Edit2 } from "lucide-react";
import { Dialog, DialogContent } from "@workspace/ui/components/overlay/dialog";
import type { EditForm } from "./admin-helpers";
import { AdminDialogFormFields } from "./admin-dialog-form-fields";

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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <AdminDialogFormFields
          headerIcon={<Edit2 className="h-5 w-5" />}
          headerTitle="Edit Admin"
          headerDescription="Update admin information"
          form={form}
          onFieldChange={(key, value) => onFormChange({ ...form, [key]: value as never })}
          onCancel={() => onOpenChange(false)}
          onAction={onSave}
          actionLabel="Save Changes"
          saving={saving}
        />
      </DialogContent>
    </Dialog>
  );
}
// jscpd:ignore-end
