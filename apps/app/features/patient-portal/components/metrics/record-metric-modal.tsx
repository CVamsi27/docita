"use client";

import { FormEvent, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import { getUserFacingErrorMessage } from "@workspace/types";
import { Loader2 } from "lucide-react";
import { useRecordPortalMetricValue } from "@/hooks/api/use-patient-portal";

interface MetricDefinition {
  id: string;
  label: string;
  unit?: string | null;
  valueType: string;
}

interface RecordMetricModalProps {
  definition: MetricDefinition;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function RecordMetricModal({
  definition,
  open,
  onClose,
  onSuccess,
}: RecordMetricModalProps) {
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const { mutateAsync, isPending } = useRecordPortalMetricValue();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!value.trim()) {
      setLocalError("Enter a value");
      return;
    }

    try {
      const payload: Parameters<typeof mutateAsync>[0] = {
        definitionId: definition.id,
        notes: notes.trim() || undefined,
        recordedAt: new Date().toISOString(),
      };

      if (
        definition.valueType === "NUMBER" ||
        definition.valueType === "DECIMAL"
      ) {
        const num = parseFloat(value);
        if (isNaN(num)) {
          setLocalError("Enter a valid number");
          return;
        }
        payload.valueNumber = num;
      } else if (definition.valueType === "BOOLEAN") {
        payload.valueBoolean = value.toLowerCase() === "true";
      } else {
        payload.valueString = value.trim();
      }

      await mutateAsync(payload);
      setValue("");
      setNotes("");
      onSuccess?.();
      onClose();
    } catch (err) {
      setLocalError(
        getUserFacingErrorMessage(err, {
          fallback: "We could not save this metric reading. Please try again.",
          context: "save",
        }),
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record {definition.label}</DialogTitle>
          <DialogDescription>
            Save a new reading for this patient-visible health metric.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="metric-value">
              Value{definition.unit ? ` (${definition.unit})` : ""}
            </Label>
            <Input
              id="metric-value"
              type={
                definition.valueType === "NUMBER" ||
                definition.valueType === "DECIMAL"
                  ? "number"
                  : "text"
              }
              step={definition.valueType === "DECIMAL" ? "0.01" : undefined}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              disabled={isPending}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="metric-notes">Notes (optional)</Label>
            <Textarea
              id="metric-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isPending}
              rows={3}
              placeholder="Any additional context..."
            />
          </div>
          {localError && (
            <p className="text-sm text-destructive">{localError}</p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
