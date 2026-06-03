"use client";

import { Edit2 } from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
import { Input } from "@workspace/ui/components/form/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/overlay/dialog";
import { Label } from "@workspace/ui/components/form/label";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { internalClinicAdminTypeSchema } from "@workspace/types";
import type { EditForm } from "./admin-helpers";

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
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit2 className="h-5 w-5" />
            Edit Admin
          </DialogTitle>
          <DialogDescription>Update admin information</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Name *</Label>
            <Input
              id="edit-name"
              placeholder="Admin name"
              value={form.name}
              onChange={(e) => onFormChange({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-email">Email *</Label>
            <Input
              id="edit-email"
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) =>
                onFormChange({ ...form, email: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-phoneNumber">Phone Number</Label>
            <Input
              id="edit-phoneNumber"
              type="tel"
              placeholder="Phone number"
              value={form.phoneNumber}
              onChange={(e) =>
                onFormChange({ ...form, phoneNumber: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-adminType">Admin Type *</Label>
            <Select
              value={form.adminType}
              onValueChange={(value) => {
                const parsed = internalClinicAdminTypeSchema.safeParse(value);
                if (!parsed.success) return;
                onFormChange({ ...form, adminType: parsed.data });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Admin type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">
                  Clinic Admin (manages clinics with multiple doctors)
                </SelectItem>
                <SelectItem value="admin_doctor">
                  Admin Doctor (for single-doctor clinics)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={onSave} disabled={saving}>
              {saving && (
                <DocitaLoadingIndicator
                  variant="inline"
                  decorative
                  className="mr-2"
                />
              )}
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
