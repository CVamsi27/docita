"use client";

import type { ReactNode } from "react";
import type { CreateForm, EditForm } from "./admin-helpers";
import { AdminDialogActions, AdminDialogHeader, AdminEmailField, AdminNameField, AdminPasswordField, AdminPhoneNumberField, AdminTypeSelect } from "./admin-dialog-shell";

interface AdminDialogFormFieldsProps {
  headerIcon: ReactNode;
  headerTitle: string;
  headerDescription: string;
  form: CreateForm | EditForm;
  onFieldChange: (key: string, value: string) => void;
  showPassword?: boolean;
  onCancel: () => void;
  onAction: () => void;
  actionLabel: string;
  saving: boolean;
  typeSelectHelperText?: string;
}

export function AdminDialogFormFields({
  headerIcon,
  headerTitle,
  headerDescription,
  form,
  onFieldChange,
  showPassword,
  onCancel,
  onAction,
  actionLabel,
  saving,
  typeSelectHelperText,
}: AdminDialogFormFieldsProps) {
  return (
    <>
      <AdminDialogHeader
        icon={headerIcon}
        title={headerTitle}
        description={headerDescription}
      />
      <div className="space-y-4">
        <AdminNameField
          id="name"
          value={form.name}
          onChange={(v) => onFieldChange("name", v)}
        />
        <AdminEmailField
          id="email"
          value={form.email}
          onChange={(v) => onFieldChange("email", v)}
        />
        {showPassword && (
          <AdminPasswordField
            id="password"
            value={"password" in form ? form.password : ""}
            onChange={(v) => onFieldChange("password", v)}
          />
        )}
        <AdminPhoneNumberField
          id="phoneNumber"
          value={form.phoneNumber}
          onChange={(v) => onFieldChange("phoneNumber", v)}
        />
        <AdminTypeSelect
          value={form.adminType}
          onChange={(v) => onFieldChange("adminType", v)}
          showIcons={!!showPassword}
          helperText={typeSelectHelperText}
        />
        <AdminDialogActions
          onCancel={onCancel}
          onAction={onAction}
          actionLabel={actionLabel}
          saving={saving}
        />
      </div>
    </>
  );
}
