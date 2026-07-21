"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  ScrollArea
} from "@workspace/ui/components";
import { PrivacyPolicyContent, SLAContent } from "@/features/legal";

export function LegalDialog({
  legalDialog,
  onClose,
}: {
  legalDialog: null | "terms" | "privacy";
  onClose: () => void;
}) {
  return (
    <Dialog
      open={legalDialog !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-3xl max-h-[85vh] p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-xl">
            {legalDialog === "privacy" ? "Privacy Policy" : "Terms"}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(85vh-84px)] px-6 pb-6">
          <div className="pt-2">
            {legalDialog === "privacy" ? <PrivacyPolicyContent /> : null}
            {legalDialog === "terms" ? <SLAContent /> : null}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
