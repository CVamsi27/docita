import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Clock } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea } from "@workspace/ui/components/form/form-primitives";
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Label } from "@workspace/ui/components";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import type { MarkDoctorDelayInput } from "@workspace/data-access";

const DELAY_OPTIONS = [
  { value: "5", label: "5 minutes" },
  { value: "10", label: "10 minutes" },
  { value: "15", label: "15 minutes" },
  { value: "20", label: "20 minutes" },
  { value: "30", label: "30 minutes" },
  { value: "45", label: "45 minutes" },
  { value: "60", label: "1 hour" },
  { value: "90", label: "1.5 hours" },
  { value: "120", label: "2 hours" },
];

export interface DoctorOption {
  id: string;
  name: string;
}

export interface MarkDoctorDelayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** If provided, the doctor is pre-selected and cannot be changed. */
  doctorId?: string;
  doctorName?: string;
  /** Required when doctorId is not pre-provided; shows a doctor selector. */
  doctors?: DoctorOption[];
  isLoading?: boolean;
  onConfirm: (input: MarkDoctorDelayInput) => void | Promise<void>;
}

export function MarkDoctorDelayDialog({
  open,
  onOpenChange,
  doctorId: preselectedDoctorId,
  doctorName: preselectedDoctorName,
  doctors,
  isLoading = false,
  onConfirm,
}: MarkDoctorDelayDialogProps) {
  const { t } = useTranslation("Appointments");
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
  const [delayMinutes, setDelayMinutes] = useState<string>("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const effectiveDoctorId = preselectedDoctorId ?? selectedDoctorId;
  const effectiveDoctorName =
    preselectedDoctorName ??
    doctors?.find((d) => d.id === selectedDoctorId)?.name ??
    "";

  const handleConfirm = async () => {
    if (!effectiveDoctorId) {
      setError(t("delayDialog.errorDoctorRequired"));
      return;
    }
    const minutes = parseInt(delayMinutes, 10);
    if (!minutes || minutes < 1) {
      setError(t("delayDialog.errorDurationRequired"));
      return;
    }
    setError(null);
    await onConfirm({
      doctorId: effectiveDoctorId,
      delayMinutes: minutes,
      reason: reason.trim() || undefined,
    });
    setDelayMinutes("");
    setReason("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {t("delayDialog.title")}
          </DialogTitle>
          <DialogDescription>
            {t("delayDialog.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!preselectedDoctorId ? (
            <div className="space-y-1.5">
              <Label htmlFor="delay-doctor">{t("delayDialog.doctorLabel")}</Label>
              <Select
                value={selectedDoctorId}
                onValueChange={setSelectedDoctorId}
              >
                <SelectTrigger id="delay-doctor">
                  <SelectValue placeholder={t("delayDialog.doctorPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {(doctors ?? []).map((doctor) => (
                    <SelectItem key={doctor.id} value={doctor.id}>
                      Dr. {doctor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-sm">
              <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="font-medium">
                Dr. {effectiveDoctorName}
              </span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="delay-minutes">{t("delayDialog.durationLabel")}</Label>
            <Select value={delayMinutes} onValueChange={setDelayMinutes}>
              <SelectTrigger id="delay-minutes">
                <SelectValue placeholder={t("delayDialog.durationPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {DELAY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="delay-reason">{t("delayDialog.reasonLabel")}</Label>
            <Textarea
              id="delay-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("delayDialog.reasonPlaceholder")}
              rows={2}
            />
          </div>

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {t("delayDialog.cancelButton")}
          </Button>
          <Button
            type="button"
            variant="warning"
            onClick={() => void handleConfirm()}
            disabled={isLoading}
          >
            {isLoading ? (
              <DocitaLoadingIndicator
                variant="inline"
                decorative
                className="mr-2"
              />
            ) : null}
            {t("delayDialog.confirmButton")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
