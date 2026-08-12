import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { AlertCircle } from "lucide-react";
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Label, Textarea } from "@workspace/ui/components";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";

const OTHER_VALUE = "other";

interface CancelAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading?: boolean;
  onConfirm: (reason: string) => void | Promise<void>;
}

export function CancelAppointmentDialog({
  open,
  onOpenChange,
  isLoading = false,
  onConfirm,
}: CancelAppointmentDialogProps) {
  const { t } = useTranslation("Appointments.cancelDialog");
  const cancelReasonSchema = useMemo(
    () =>
      z
        .string()
        .min(1, t("errorRequired"))
        .max(500, t("errorTooLong")),
    [t],
  );
  const reasonOptions = useMemo(
    () => [
      { value: "patient-requested", label: t("reasonPatientRequested") },
      { value: "doctor-unavailable", label: t("reasonDoctorUnavailable") },
      { value: "clinic-closed", label: t("reasonClinicClosed") },
      { value: "duplicate", label: t("reasonDuplicate") },
      { value: OTHER_VALUE, label: t("reasonOther") },
    ],
    [t],
  );

  const [selectedReason, setSelectedReason] = useState<string>("");
  const [otherReason, setOtherReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isOther = selectedReason === OTHER_VALUE;

  const reset = () => {
    setSelectedReason("");
    setOtherReason("");
    setError(null);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      reset();
    }
    onOpenChange(next);
  };

  const handleConfirm = async () => {
    setError(null);

    const rawReason = isOther ? otherReason.trim() : selectedReason;
    const parsed = cancelReasonSchema.safeParse(rawReason);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? t("errorFallback"));
      return;
    }

    await onConfirm(parsed.data);
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <AlertCircle className="h-5 w-5 mt-1 text-destructive" />
            <div className="flex-1">
              <DialogTitle>{t("title")}</DialogTitle>
              <DialogDescription className="mt-2">
                {t("description")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("reasonLabel")}</Label>
            <Select value={selectedReason} onValueChange={setSelectedReason}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("reasonLabel")} />
              </SelectTrigger>
              <SelectContent>
                {reasonOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isOther && (
            <div className="space-y-2">
              <Label>{t("otherReasonLabel")}</Label>
              <Textarea
                value={otherReason}
                onChange={(e) => setOtherReason(e.target.value)}
                placeholder={t("reasonLabel")}
                className="min-h-[90px]"
              />
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            {t("keepButton")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={isLoading}
            className="gap-2"
          >
            {isLoading && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            )}
            {t("cancelButton")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
