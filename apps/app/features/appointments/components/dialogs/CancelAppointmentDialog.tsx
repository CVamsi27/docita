"use client";

import { useMemo, useState } from "react";
import { z } from "zod";
import { AlertCircle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";

const cancelReasonSchema = z
  .string()
  .min(1, "Select a cancellation reason")
  .max(500, "Reason is too long");

const OTHER_VALUE = "other";

export interface CancelAppointmentDialogProps {
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
  const reasonOptions = useMemo(
    () => [
      { value: "patient-requested", label: "Patient requested" },
      { value: "doctor-unavailable", label: "Doctor unavailable" },
      { value: "clinic-closed", label: "Clinic closed" },
      { value: "duplicate", label: "Duplicate booking" },
      { value: OTHER_VALUE, label: "Other / Custom" },
    ],
    [],
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
      setError(parsed.error.issues[0]?.message ?? "Enter a cancellation reason.");
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
            <AlertCircle className="h-5 w-5 text-destructive" />
            <div className="flex-1">
              <DialogTitle>Cancel Appointment</DialogTitle>
              <DialogDescription className="mt-2">
                Choose a reason so the schedule stays auditable
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Reason</Label>
            <Select value={selectedReason} onValueChange={setSelectedReason}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Reason" />
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
              <Label>Other reason</Label>
              <Textarea
                value={otherReason}
                onChange={(e) => setOtherReason(e.target.value)}
                placeholder="Cancellation reason"
                className="min-h-[90px]"
              />
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            Keep Appointment
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={isLoading}
            className="gap-2"
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            Cancel Appointment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
