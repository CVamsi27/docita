"use client";

// jscpd:ignore-start
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@workspace/ui/components";
import {
  consultationDraftNeedsLeaveGuard,
// jscpd:ignore-end
  useConsultationDraft,
} from "@/features/consultation/state/useConsultationDraft";

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
  const needsLeaveGuard = consultationDraftNeedsLeaveGuard({
    dirty,
    saveState,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Leave consultation?</DialogTitle>
          <DialogDescription>
            {saving
              ? "Your consultation is still saving. You can wait here or choose to leave; unsaved work may be lost if you leave now."
              : needsLeaveGuard
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
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
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
                <DocitaLoadingIndicator
                  variant="inline"
                  decorative
                  className="mr-2"
                />
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
