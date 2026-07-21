"use client";

import {
  Button,
  SymbolTooltip
} from "@workspace/ui/components";
import { ChevronUp, Stethoscope } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { useFloatingStartConsultation } from "./use-floating-start-consultation";

interface FloatingStartConsultationProps {
  patientId?: string;
  appointmentId?: string;
  className?: string;
  minimized?: boolean;
}

export function FloatingStartConsultation({
  patientId,
  appointmentId,
  className,
  minimized = false,
}: FloatingStartConsultationProps) {
  const {
    shouldRender,
    isMinimized,
    setIsMinimized,
    isResumeFlow,
    patientName,
    isStartPending,
    onStartConsultation,
  } = useFloatingStartConsultation({ patientId, appointmentId, minimized });

  if (!shouldRender) return null;

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 transition-opacity duration-150",
        className,
      )}
    >
      {isMinimized ? (
        <SymbolTooltip
          label={
            isResumeFlow ? "Resume consultation" : "Open start consultation"
          }
        >
          <Button
            size="icon"
            className="h-14 w-14 rounded-full shadow-md hover:shadow-lg"
            onClick={() => setIsMinimized(false)}
            aria-label={
              isResumeFlow ? "Resume consultation" : "Open start consultation"
            }
          >
            <Stethoscope className="h-6 w-6" />
          </Button>
        </SymbolTooltip>
      ) : (
        <div className="bg-primary text-primary-foreground rounded-lg shadow-md p-4 w-[calc(100vw-2rem)] max-w-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5" />
              <span className="font-semibold">
                {isResumeFlow ? "Resume Consultation" : "Start Consultation"}
              </span>
            </div>
            <SymbolTooltip label="Minimize">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-primary-foreground hover:bg-primary-foreground/20"
                onClick={() => setIsMinimized(true)}
                aria-label="Minimize"
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
            </SymbolTooltip>
          </div>
          <p className="text-sm text-primary-foreground/80 mb-3">
            {patientName
              ? `${isResumeFlow ? "Continue" : "Begin"} consult for ${patientName}.`
              : "Open consultation queue now"}
          </p>
          <Button
            variant="secondary"
            className="w-full"
            disabled={isStartPending}
            onClick={onStartConsultation}
          >
            {isResumeFlow ? "Resume Now" : "Begin Now"}
          </Button>
        </div>
      )}
    </div>
  );
}
