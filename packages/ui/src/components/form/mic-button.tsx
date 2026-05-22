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
}

export function MicButton({
  isListening,
  isSupported = true,
  onClick,
  className,
  size = "icon",
}: MicButtonProps) {
  if (!isSupported) {
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

  return (
    <TooltipProvider delayDuration={300}>
      <SymbolTooltip label={stateLabel}>
        <Button
          type="button"
          variant="ghost"
          size={size}
          onClick={onClick}
          aria-label={stateLabel}
          className={cn(
            "relative transition-colors",
            isListening
              ? "text-destructive hover:text-destructive/80"
              : "text-muted-foreground hover:text-foreground",
            className,
          )}
        >
          {isListening ? (
            <>
              <Mic className="h-4 w-4" />
              <span className="absolute inset-0 rounded-md animate-ping bg-destructive/20 pointer-events-none" />
            </>
          ) : (
            <Mic className="h-4 w-4" />
          )}
        </Button>
      </SymbolTooltip>
    </TooltipProvider>
  );
}
