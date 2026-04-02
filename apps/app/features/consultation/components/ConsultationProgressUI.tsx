import { AlertCircle, Check } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";

export interface ConsultationStep {
  id: string;
  label: string;
  shortLabel: string;
  isRequired: boolean;
  isComplete: boolean;
  hasWarnings?: boolean;
  warningMessage?: string;
}

export interface ConsultationProgressUIProps {
  steps: ConsultationStep[];
  currentStepId: string;
  progress: {
    percentage: number;
    completedCount: number;
    totalCount: number;
    requiredComplete: number;
    requiredCount: number;
    isMinimumMet: boolean;
  };
  onStepClick?: (stepId: string) => void;
  className?: string;
  compact?: boolean;
}

export function ConsultationProgressUI({
  steps,
  currentStepId,
  progress,
  onStepClick,
  className,
  compact = false,
}: ConsultationProgressUIProps) {
  const _currentStepIndex = steps.findIndex((s) => s.id === currentStepId);

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full transition-colors duration-150",
              progress.isMinimumMet ? "bg-success" : "bg-primary",
            )}
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
        <span
          className={cn(
            "text-xs font-medium",
            progress.isMinimumMet ? "text-success" : "text-muted-foreground",
          )}
        >
          {progress.percentage}%
        </span>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full transition-colors duration-150",
              progress.isMinimumMet ? "bg-success" : "bg-primary",
            )}
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
        <span
          className={cn(
            "text-sm font-semibold min-w-12 text-right",
            progress.isMinimumMet ? "text-success" : "text-foreground",
          )}
        >
          {progress.percentage}%
        </span>
      </div>

      {}
      <TooltipProvider delayDuration={0}>
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const isCurrent = step.id === currentStepId;

            return (
              <div key={step.id} className="flex items-center">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onStepClick?.(step.id)}
                      className={cn(
                        "flex flex-col items-center gap-1 transition-colors duration-150",
                        onStepClick && "cursor-pointer",
                        !onStepClick && "cursor-default",
                      )}
                    >
                      <div
                        className={cn(
                          "h-8 w-8 rounded-full flex items-center justify-center border-2 transition-colors duration-150",
                          step.isComplete &&
                            "bg-success border-success text-success-foreground",
                          !step.isComplete &&
                            isCurrent &&
                            "border-primary bg-primary/10 text-primary",
                          !step.isComplete &&
                            !isCurrent &&
                            "border-muted bg-background text-muted-foreground",
                          step.hasWarnings &&
                            !step.isComplete &&
                            "border-warning bg-warning/10",
                        )}
                      >
                        {step.isComplete ? (
                          <Check className="h-4 w-4" />
                        ) : step.hasWarnings ? (
                          <AlertCircle className="h-4 w-4 text-warning" />
                        ) : (
                          <span className="text-xs font-medium">
                            {index + 1}
                          </span>
                        )}
                      </div>
                      <span
                        className={cn(
                          "text-[10px] font-medium max-w-[60px] text-center leading-tight",
                          step.isComplete && "text-success",
                          isCurrent && !step.isComplete && "text-primary",
                          !step.isComplete &&
                            !isCurrent &&
                            "text-muted-foreground",
                        )}
                      >
                        {step.shortLabel}
                      </span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <div className="text-center">
                      <p className="font-medium">{step.label}</p>
                      {step.isRequired && !step.isComplete && (
                        <p className="text-xs text-warning">Required</p>
                      )}
                      {step.hasWarnings && step.warningMessage && (
                        <p className="text-xs text-warning">
                          {step.warningMessage}
                        </p>
                      )}
                      {step.isComplete && (
                        <p className="text-xs text-success">Completed</p>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>

                {}
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "h-0.5 w-4 sm:w-8 md:w-12 mx-1",
                      steps[index + 1]!.isComplete || step.isComplete
                        ? "bg-success"
                        : isCurrent
                          ? "bg-primary/30"
                          : "bg-muted",
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </TooltipProvider>

      {}
      <div className="flex items-center justify-center gap-2 text-xs">
        {progress.isMinimumMet ? (
          <span className="flex items-center gap-1 text-success">
            <Check className="h-3 w-3" />
            Ready to complete consultation
          </span>
        ) : (
          <span className="text-muted-foreground">
            {progress.requiredCount - progress.requiredComplete} required
            field(s) remaining
          </span>
        )}
      </div>
    </div>
  );
}
