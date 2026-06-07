"use client";

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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/overlay/dialog";
import { Label } from "@workspace/ui/components/form/label";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { internalClinicAdminTypeSchema } from "@workspace/types";
import type { ReactNode } from "react";
import { Shield, Users } from "lucide-react";

export function AdminDialogHeader({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2">
        {icon}
        {title}
      </DialogTitle>
      <DialogDescription>{description}</DialogDescription>
    </DialogHeader>
  );
}

interface AdminDialogActionsProps {
  onCancel: () => void;
  onAction: () => void;
  actionLabel: string;
  saving: boolean;
}

export function AdminDialogActions({
  onCancel,
  onAction,
  actionLabel,
  saving,
}: AdminDialogActionsProps) {
  return (
    <div className="flex justify-end gap-2 pt-4">
      <Button variant="outline" onClick={onCancel}>
        Cancel
      </Button>
      <Button onClick={onAction} disabled={saving}>
        {saving && (
          <DocitaLoadingIndicator
            variant="inline"
            decorative
            className="mr-2"
          />
        )}
        {actionLabel}
      </Button>
    </div>
  );
}

interface AdminNameFieldProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
}

export function AdminNameField({ id, value, onChange }: AdminNameFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Name *</Label>
      <Input
        id={id}
        placeholder="Admin name"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

interface AdminEmailFieldProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
}

export function AdminEmailField({ id, value, onChange }: AdminEmailFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Email *</Label>
      <Input
        id={id}
        type="email"
        placeholder="Email"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

interface AdminPhoneNumberFieldProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
}

export function AdminPhoneNumberField({ id, value, onChange }: AdminPhoneNumberFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Phone Number</Label>
      <Input
        id={id}
        type="tel"
        placeholder="Phone number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

interface AdminTypeSelectProps {
  value: string;
  onChange: (value: string) => void;
  showIcons?: boolean;
  helperText?: string;
}

interface AdminPasswordFieldProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
}

export function AdminPasswordField({ id, value, onChange }: AdminPasswordFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Password *</Label>
      <Input
        id={id}
        type="password"
        placeholder="Enter password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function AdminTypeSelect({ value, onChange, showIcons, helperText }: AdminTypeSelectProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="adminType">Admin Type *</Label>
      <Select
        value={value}
        onValueChange={(newValue) => {
          const parsed = internalClinicAdminTypeSchema.safeParse(newValue);
          if (!parsed.success) return;
          onChange(newValue);
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="Admin type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="admin">
            {showIcons ? (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Clinic Admin (manages clinics with multiple doctors)
              </div>
            ) : (
              "Clinic Admin (manages clinics with multiple doctors)"
            )}
          </SelectItem>
          <SelectItem value="admin_doctor">
            {showIcons ? (
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Admin Doctor (for single-doctor clinics)
              </div>
            ) : (
              "Admin Doctor (for single-doctor clinics)"
            )}
          </SelectItem>
        </SelectContent>
      </Select>
      {helperText && (
        <p className="text-xs text-muted-foreground mt-1">{helperText}</p>
      )}
    </div>
  );
}
