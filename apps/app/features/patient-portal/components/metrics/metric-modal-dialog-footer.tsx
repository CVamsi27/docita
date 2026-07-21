"use client";

import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import {
  Button,
  DialogFooter
} from "@workspace/ui/components";

interface MetricModalDialogFooterProps {
  isPending: boolean;
  onClose: () => void;
  submitLabel: string;
  submitPendingLabel: string;
  error?: string | null;
}

export function MetricModalDialogFooter({
  isPending,
  onClose,
  submitLabel,
  submitPendingLabel,
  error,
}: MetricModalDialogFooterProps) {
  return (
    <>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
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
              <DocitaLoadingIndicator
                variant="inline"
                decorative
                className="mr-2"
              />
              {submitPendingLabel}
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </DialogFooter>
    </>
  );
}
