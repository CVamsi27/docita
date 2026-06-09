"use client";

import { Square } from "lucide-react";
import { PromptInput } from "@workspace/ui/components/form/prompt-input";
import { Button } from "@workspace/ui/components/form/button";
import { formatCountLocale } from "@workspace/utils";
import type { AiCreditBalance } from "@workspace/types";

interface AskAiInputProps {
  submitting: boolean;
  scopeLabel: string;
  aiCreditBalance: AiCreditBalance;
  onSend: (prompt: string) => void;
  onStop: () => void;
}

export function AskAiInput({
  submitting,
  scopeLabel,
  aiCreditBalance,
  onSend,
  onStop,
}: AskAiInputProps) {
  const scopeChip = (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-[var(--fs-2xs)] font-medium text-muted-foreground">
      <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-primary" />
      <span className="truncate">{scopeLabel}</span>
    </span>
  );

  return (
    <div className="shrink-0 border-t border-border/50 bg-muted/10 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:pb-5 sm:pt-4">
      <div className="flex items-end gap-2">
        <PromptInput
          className="flex-1"
          onSubmitPrompt={onSend}
          submitting={submitting}
          placeholder="Ask anything…"
          aria-label="Ask AI prompt"
          autoFocus
        />
        {submitting ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-9 shrink-0 rounded-full"
            onClick={onStop}
            aria-label="Stop generating"
          >
            <Square className="size-3.5" aria-hidden />
          </Button>
        ) : null}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 overflow-hidden">
          {scopeChip}
          {aiCreditBalance.enforced &&
          aiCreditBalance.remaining !== null ? (
            <span className="inline-flex shrink-0 items-center rounded-full border border-border/60 bg-background px-2.5 py-1 text-[var(--fs-2xs)] font-medium text-muted-foreground">
              {formatCountLocale(aiCreditBalance.remaining)} credits left
            </span>
          ) : null}
        </div>
        <p className="hidden shrink-0 text-[var(--fs-2xs)] text-muted-foreground/70 sm:block">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
      <p className="mt-2 text-[var(--fs-2xs)] leading-snug text-muted-foreground/60">
        Not medical advice—confirm with a clinician.
      </p>
    </div>
  );
}
