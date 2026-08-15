import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/overlay/dialog";
import { isRecord } from "@workspace/utils";
import { apiPost } from "@/lib/api/api-client";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import {
  INITIAL_REFERRER_FORM_DATA,
  REFERRER_TYPE_OPTIONS,
  validateCreateReferrerForm,
  type CreateReferrerFormData,
  type ReferrerFieldErrors,
} from "../lib/referrer-form-helpers";

interface CreateReferrerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

function isDuplicateEntryConflict(error: unknown): boolean {
  return (
    isRecord(error) &&
    error.status === 409 &&
    (error.code === "DUPLICATE_ENTRY" ||
      (isRecord(error.data) && error.data.code === "DUPLICATE_ENTRY"))
  );
}

/**
 * Operator-facing "Create partner" dialog. Submits to
 * `POST /api/internal/referrers`; a 409 from the server surfaces the
 * existing-partner conflict inline (idempotent on normalized phone) instead
 * of creating a duplicate.
 */
export function CreateReferrerDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateReferrerDialogProps) {
  const [form, setForm] = useState<CreateReferrerFormData>({
    ...INITIAL_REFERRER_FORM_DATA,
  });
  const [fieldErrors, setFieldErrors] = useState<ReferrerFieldErrors>({});
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Reset transient form state every time the dialog opens so a previous
  // close does not leak stale validation/conflict errors into a fresh create.
  useEffect(() => {
    if (open) {
      setFieldErrors({});
      setConflictMessage(null);
    }
  }, [open]);

  const updateField = (field: keyof CreateReferrerFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    setConflictMessage(null);
  };

  const handleCreate = async () => {
    const errors = validateCreateReferrerForm(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    try {
      await apiPost("/api/internal/referrers", {
        name: form.name.trim(),
        type: form.type,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
      });
      setForm({ ...INITIAL_REFERRER_FORM_DATA });
      setFieldErrors({});
      setConflictMessage(null);
      onOpenChange(false);
      onCreated();
      toast.success("Partner created successfully");
    } catch (error) {
      const record = isRecord(error) ? error : null;
      const data = record && isRecord(record.data) ? record.data : null;
      if (record && isDuplicateEntryConflict(record) && data) {
        const detail =
          typeof data.detail === "string" ? data.detail : null;
        // The server message has no trailing period; normalize so the
        // composed sentence reads correctly however the copy evolves.
        const base =
          detail ?? "A partner with this phone number already exists";
        const normalized = base.endsWith(".") ? base : `${base}.`;
        setConflictMessage(`${normalized} Use the existing record instead.`);
      } else {
        showUserFacingErrorToast(
          error,
          "We could not create this partner right now. Please try again.",
        );
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Partner</DialogTitle>
          <DialogDescription>
            Add a referral partner. A unique shareable code (RFR-XXXXXX) and
            welcome message are generated automatically.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
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
          {conflictMessage && (
            <p className="text-sm text-destructive">{conflictMessage}</p>
          )}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={() => void handleCreate()} disabled={saving}>
              {saving ? "Creating…" : "Create Partner"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
