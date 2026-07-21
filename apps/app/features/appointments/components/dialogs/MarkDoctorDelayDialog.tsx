"use client";

// jscpd:ignore-start
import { useState } from "react";
import { Clock } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea } from "@workspace/ui/components/form/form-primitives"
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Label } from "@workspace/ui/components";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import type { MarkDoctorDelayInput } from "@workspace/data-access";

const DELAY_OPTIONS = [
// jscpd:ignore-end
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
      setError("Please select a doctor");
      return;
    }
    const minutes = parseInt(delayMinutes, 10);
    if (!minutes || minutes < 1) {
      setError("Please select a delay duration");
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
    setSelectedDoctorId("");
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setDelayMinutes("");
      setReason("");
      setError(null);
      setSelectedDoctorId("");
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-warning" />
            Mark Doctor Delay
          </DialogTitle>
          <DialogDescription>
            {effectiveDoctorName ? (
              <>
                Shift all upcoming appointments for{" "}
                <span className="font-medium text-foreground">
                  {effectiveDoctorName}
                </span>{" "}
                today.
              </>
            ) : (
              "Shift all upcoming appointments for the selected doctor today."
            )}{" "}
            Patients will be notified of the updated time.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {!preselectedDoctorId && doctors && doctors.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="delay-doctor">Doctor</Label>
              <Select
                value={selectedDoctorId}
                onValueChange={setSelectedDoctorId}
              >
                <SelectTrigger id="delay-doctor">
                  <SelectValue placeholder="Select doctor…" />
                </SelectTrigger>
                <SelectContent>
                  {doctors.map((doc) => (
                    <SelectItem key={doc.id} value={doc.id}>
                      {doc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="delay-duration">Delay duration</Label>
            <Select value={delayMinutes} onValueChange={setDelayMinutes}>
              <SelectTrigger id="delay-duration">
                <SelectValue placeholder="Select delay duration…" />
              </SelectTrigger>
              <SelectContent>
                {DELAY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="delay-reason">
              Reason{" "}
              <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Textarea
              id="delay-reason"
              placeholder="e.g. Emergency procedure, traffic delay…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              rows={2}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="default"
            onClick={handleConfirm}
            disabled={
              isLoading ||
              !delayMinutes ||
              (!preselectedDoctorId && !selectedDoctorId)
            }
          >
            {isLoading ? (
              <DocitaLoadingIndicator className="mr-2 h-4 w-4" />
            ) : null}
            Mark Delay &amp; Notify Patients
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
