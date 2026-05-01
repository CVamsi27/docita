"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { useConsultationDraft } from "@/features/consultation/state/useConsultationDraft";

interface ConsultationLeaveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leaveBusy: boolean;
  onSaveAndLeave: () => void | Promise<void>;
  onLeaveWithoutSaving: () => void;
}

export function ConsultationLeaveDialog({
  open,
  onOpenChange,
  leaveBusy,
  onSaveAndLeave,
  onLeaveWithoutSaving,
}: ConsultationLeaveDialogProps) {
  const dirty = useConsultationDraft((s) => s.dirty);
  const saveState = useConsultationDraft((s) => s.saveState);
  const lastError = useConsultationDraft((s) => s.lastError);

  const saving = saveState === "saving";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Leave consultation?</DialogTitle>
          <DialogDescription>
            {saving
              ? "Your consultation is still saving. You can wait here or choose to leave; unsaved work may be lost if you leave now."
              : dirty || saveState === "error"
                ? "You have unsaved changes. Save your draft before leaving, or leave without saving."
                : "You can leave this consultation workspace."}
          </DialogDescription>
        </DialogHeader>
        {saveState === "error" && lastError ? (
          <p
            className="text-sm text-destructive"
            role="alert"
            aria-live="polite"
          >
            {lastError}
          </p>
        ) : null}
        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Stay
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={leaveBusy || saving}
            onClick={onLeaveWithoutSaving}
          >
            Leave without saving
          </Button>
          <Button
            type="button"
            disabled={leaveBusy || saving}
            onClick={() => void onSaveAndLeave()}
          >
            {leaveBusy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                Saving
              </>
            ) : (
              "Save and leave"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
