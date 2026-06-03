"use client";

import { Plus, Shield, Users } from "lucide-react";
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
import type { CreateForm } from "./admin-helpers";

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
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create New Admin
          </DialogTitle>
          <DialogDescription>
            Add a new administrator to the selected clinic
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              placeholder="Admin name"
              value={form.name}
              onChange={(e) => onFormChange({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) =>
                onFormChange({ ...form, email: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password *</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter password"
              value={form.password}
              onChange={(e) =>
                onFormChange({ ...form, password: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Phone Number</Label>
            <Input
              id="phoneNumber"
              type="tel"
              placeholder="Phone number"
              value={form.phoneNumber}
              onChange={(e) =>
                onFormChange({ ...form, phoneNumber: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="adminType">Admin Type *</Label>
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
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Clinic Admin (manages clinics with multiple doctors)
                  </div>
                </SelectItem>
                <SelectItem value="admin_doctor">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Admin Doctor (for single-doctor clinics)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              {form.adminType === "admin_doctor"
                ? "Admin Doctor can manage clinic operations and provide clinical care"
                : "Clinic Admin manages clinic operations and staff"}
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button onClick={onCreate} disabled={saving}>
              {saving && (
                <DocitaLoadingIndicator
                  variant="inline"
                  decorative
                  className="mr-2"
                />
              )}
              Create Admin
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
