"use client";

import * as React from "react";
import { ArrowUp, Sparkles } from "lucide-react";
import { cn } from "../lib/utils";
import { Button } from "./button";

export interface PromptInputProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "onSubmit"> {
  onSubmitPrompt: (value: string) => void;
  submitting?: boolean;
  leadingIcon?: React.ReactNode;
  /** Optional chip rendered above the input that names the current AI scope. */
  scopeChip?: React.ReactNode;
}

export const PromptInput = React.forwardRef<HTMLTextAreaElement, PromptInputProps>(
  function PromptInput(
    {
      className,
      onSubmitPrompt,
      submitting = false,
      leadingIcon,
      scopeChip,
      placeholder = "Ask anything…",
      disabled,
      onKeyDown,
      ...rest
    },
    ref,
  ) {
    const [value, setValue] = React.useState("");
    const internalRef = React.useRef<HTMLTextAreaElement | null>(null);

    React.useImperativeHandle(ref, () => internalRef.current as HTMLTextAreaElement);

    const submit = React.useCallback(() => {
      const trimmed = value.trim();
      if (!trimmed || submitting || disabled) return;
      onSubmitPrompt(trimmed);
      setValue("");
    }, [value, onSubmitPrompt, submitting, disabled]);

    function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
      onKeyDown?.(event);
      if (event.defaultPrevented) return;
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        submit();
      }
    }

    return (
      <div className={cn("flex flex-col gap-2", className)}>
        {scopeChip ? (
          <div className="flex items-center gap-2 text-[var(--fs-2xs)] text-muted-foreground">
            {scopeChip}
          </div>
        ) : null}
        <div
          className={cn(
            "flex items-end gap-2 rounded-full border border-border bg-card px-3 py-2 shadow-sm",
            "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background",
            disabled && "opacity-60",
          )}
        >
          <span aria-hidden className="mt-1.5 text-muted-foreground">
            {leadingIcon ?? <Sparkles className="size-4" />}
          </span>
          <textarea
            ref={internalRef}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder={placeholder}
            disabled={disabled}
            className="min-h-[1.75rem] max-h-40 flex-1 resize-none border-none bg-transparent text-sm leading-snug placeholder:text-muted-foreground focus:outline-none"
            aria-label="Ask the assistant"
            {...rest}
          />
          <Button
            type="button"
            size="icon"
            variant="default"
            className="size-8 shrink-0 rounded-full"
            onClick={submit}
            disabled={disabled || submitting || value.trim().length === 0}
            aria-label="Send prompt"
          >
            <ArrowUp className="size-4" />
          </Button>
        </div>
      </div>
    );
  },
);
