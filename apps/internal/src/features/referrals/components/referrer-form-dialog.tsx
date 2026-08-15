import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components";
import { CRUDDialog } from "@workspace/ui/components/overlay/crud-dialog";
import { apiPatch, apiPost } from "@/lib/api/api-client";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { formatDate } from "../../../lib/formatters";
import type { Referral } from "../types";
import {
  conflictMessageFromError,
  INITIAL_REFERRER_FORM_DATA,
  REFERRER_TYPE_OPTIONS,
  validateReferrerForm,
  type ReferrerFieldErrors,
  type ReferrerFormData,
} from "../lib/referrer-form-helpers";

interface ReferrerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * The partner being edited, or null to create a new partner. Editing a
   * partner PATCHes the full editable field set to
   * `PATCH /api/internal/referrers/:id` (empty phone/email clear the stored
   * value); creating POSTs to `POST /api/internal/referrers`. Either way a
   * `DUPLICATE_ENTRY` 409 surfaces the existing-partner conflict inline.
   */
  referrer: Referral | null;
  onSaved: () => void;
}

/**
 * Operator form for creating and editing referral partners. The two modes
 * share the same field set, validation, and inline conflict handling; only
 * the endpoint, seed values, and copy differ.
 */
export function ReferrerFormDialog({
  open,
  onOpenChange,
  referrer,
  onSaved,
}: ReferrerFormDialogProps) {
  const isEdit = referrer !== null;
  const [form, setForm] = useState<ReferrerFormData>({
    ...INITIAL_REFERRER_FORM_DATA,
  });
  const [fieldErrors, setFieldErrors] = useState<ReferrerFieldErrors>({});
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Reset transient state every time the dialog opens so a previous close
  // does not leak stale values or errors into the next open; edit mode seeds
  // the form from the row being edited.
  useEffect(() => {
    if (!open) return;
    setFieldErrors({});
    setConflictMessage(null);
    setForm(
      referrer
        ? {
            name: referrer.name,
            type: referrer.type,
            email: referrer.email ?? "",
            phone: referrer.phone ?? "",
          }
        : { ...INITIAL_REFERRER_FORM_DATA },
    );
  }, [open, referrer]);

  const updateField = (field: keyof ReferrerFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    setConflictMessage(null);
  };

  const handleSubmit = async () => {
    const errors = validateReferrerForm(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    try {
      if (isEdit && referrer) {
        // Empty strings clear the stored value on the server.
        await apiPatch(`/api/internal/referrers/${referrer.id}`, {
          name: form.name.trim(),
          type: form.type,
          email: form.email.trim(),
          phone: form.phone.trim(),
        });
        toast.success("Partner updated successfully");
      } else {
        await apiPost("/api/internal/referrers", {
          name: form.name.trim(),
          type: form.type,
          email: form.email.trim() || undefined,
          phone: form.phone.trim() || undefined,
        });
        toast.success("Partner created successfully");
      }
      onOpenChange(false);
      onSaved();
    } catch (error) {
      const message = conflictMessageFromError(error);
      if (message) {
        setConflictMessage(message);
      } else {
        showUserFacingErrorToast(
          error,
          isEdit
            ? "We could not update this partner right now. Please try again."
            : "We could not create this partner right now. Please try again.",
        );
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <CRUDDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit Partner" : "Create Partner"}
      description={
        isEdit && referrer
          ? `Update details for ${referrer.name}. Code ${referrer.code ?? "—"} and commission policy are unchanged.`
          : "Add a referral partner. A unique shareable code (RFR-XXXXXX) and welcome message are generated automatically."
      }
      isEditing={isEdit}
      isLoading={saving}
      disabled={saving}
      submitLabel={isEdit ? "Save Changes" : "Create Partner"}
      onSubmit={() => {
        void handleSubmit();
      }}
    >
      <div className="space-y-2">
        <Label>Partner type *</Label>
        <Select
          value={form.type}
          onValueChange={(value) => updateField("type", value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REFERRER_TYPE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Name *</Label>
        <Input
          value={form.name}
          onChange={(e) => updateField("name", e.target.value)}
          placeholder="Partner name"
          aria-invalid={Boolean(fieldErrors.name)}
        />
        {fieldErrors.name && (
          <p className="text-sm text-destructive">{fieldErrors.name}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label>Phone</Label>
        <Input
          type="tel"
          value={form.phone}
          onChange={(e) => updateField("phone", e.target.value)}
          placeholder="+91 98XXXXXXXX"
          aria-invalid={Boolean(fieldErrors.phone)}
        />
        {fieldErrors.phone && (
          <p className="text-sm text-destructive">{fieldErrors.phone}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label>Email</Label>
        <Input
          type="email"
          value={form.email}
          onChange={(e) => updateField("email", e.target.value)}
          placeholder="partner@example.com"
          aria-invalid={Boolean(fieldErrors.email)}
        />
        {fieldErrors.email && (
          <p className="text-sm text-destructive">{fieldErrors.email}</p>
        )}
      </div>
      {isEdit && referrer?.createdAt && (
        <p className="text-xs text-muted-foreground">
          Partner since {formatDate(referrer.createdAt)}
        </p>
      )}
      {conflictMessage && (
        <p className="text-sm text-destructive">{conflictMessage}</p>
      )}
    </CRUDDialog>
  );
}
