"use client";

import { Mic, MicOff } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { Button } from "@workspace/ui/components/form/button";
import {
  SymbolTooltip,
  TooltipProvider,
} from "@workspace/ui/components/overlay/tooltip";

interface MicButtonProps {
  isListening: boolean;
  isSupported?: boolean;
  onClick: () => void;
  className?: string;
  size?: "sm" | "default" | "lg" | "icon";
  /** Show a text label beside the icon so the start/stop state is unambiguous. */
  withLabel?: boolean;
}

export function MicButton({
  isListening,
  isSupported = true,
  onClick,
  className,
  size = "icon",
  withLabel = false,
}: MicButtonProps) {
  if (!isSupported) {
    if (withLabel) {
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground/50",
            className,
          )}
          title="Voice input is not supported in this browser"
        >
          <MicOff className="h-3.5 w-3.5" aria-hidden />
          Voice n/a
        </span>
      );
    }
    return (
      <TooltipProvider delayDuration={300}>
        <SymbolTooltip label="Voice input is not supported in this browser">
          <Button
            type="button"
            variant="ghost"
            size={size}
            disabled
            aria-label="Voice input not supported"
            className={cn("text-muted-foreground/40", className)}
          >
            <MicOff className="h-4 w-4" />
          </Button>
        </SymbolTooltip>
      </TooltipProvider>
    );
  }

  const stateLabel = isListening ? "Stop recording" : "Start voice input";

  // Labelled pill — used in forms where the start/stop affordance must read
  // clearly. Listening state is unmistakable: a pulsing dot + "Recording".
  if (withLabel) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onClick}
        aria-label={stateLabel}
        aria-pressed={isListening}
        className={cn(
          "h-7 gap-1.5 px-2.5 text-xs font-medium transition-colors duration-150",
          isListening
            ? "border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/15 hover:text-destructive"
            : "text-muted-foreground hover:text-foreground",
          className,
        )}
      >
        {isListening ? (
          <>
            <span
              className="relative inline-flex h-2 w-2 shrink-0"
              aria-hidden="true"
            >
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive/60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-destructive" />
            </span>
            Recording · Stop
          </>
        ) : (
          <>
            <Mic className="h-3.5 w-3.5" aria-hidden />
            Dictate
          </>
        )}
      </Button>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <SymbolTooltip label={stateLabel}>
        <Button
          type="button"
          variant="ghost"
          size={size}
          onClick={onClick}
          aria-label={stateLabel}
          aria-pressed={isListening}
          className={cn(
            "relative transition-colors",
            isListening
              ? "text-destructive hover:text-destructive/80"
              : "text-muted-foreground hover:text-foreground",
            className,
          )}
        >
          <Mic className="h-4 w-4" />
          {isListening ? (
            <span className="absolute inset-0 rounded-md animate-ping bg-destructive/20 pointer-events-none" />
          ) : null}
        </Button>
      </SymbolTooltip>
    </TooltipProvider>
  );
}
