"use client";

import { Sparkles, MessageSquare } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { useAskAi } from "@/features/_shared/components/ask-ai/ask-ai-context";

interface PatientCommunicationTabProps {
  patientId: string;
  patientName?: string;
}

/**
 * Patient communication thread. The per-patient WhatsApp thread API is
 * a follow-up; for now we render an empty state with an Ask AI CTA so
 * doctors can draft an outbound message without leaving the page.
 */
export function PatientCommunicationTab({
  patientId,
  patientName,
}: PatientCommunicationTabProps) {
  const { openOverlay } = useAskAi();

  const askAiToDraft = () => {
    openOverlay({
      id: `patient:${patientId}:communication`,
      label: `on ${patientName || "this patient"}`,
      payload: {
        kind: "patient",
        patientId,
        intent: "draft-message",
      },
    });
  };

  return (
    <div
      data-testid="patient-communication-tab"
      className="ui-section-stack py-8 text-center text-muted-foreground"
    >
      <div className="mx-auto flex size-16 items-center justify-center rounded-lg border border-border/70 bg-muted/40">
        <MessageSquare className="h-8 w-8 text-muted-foreground/50" aria-hidden />
      </div>
      <div className="mx-auto max-w-md space-y-2">
        <h3 className="text-base font-semibold text-foreground">
          No conversation yet
        </h3>
        <p className="text-sm">
          {patientName
            ? `Send ${patientName} a WhatsApp message or have AI draft one for you.`
            : "Send a WhatsApp message or have AI draft one for you."}
        </p>
      </div>
      <Button onClick={askAiToDraft} className="gap-2 mx-auto">
        <Sparkles className="size-4" aria-hidden />
        Draft a message with AI
      </Button>
    </div>
  );
}
