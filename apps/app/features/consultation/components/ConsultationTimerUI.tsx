import * as React from "react";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import { Clock, Pause, Play, RotateCcw, Timer } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";

export interface ConsultationTimerUIProps {
  seconds: number;
  isRunning: boolean;
  showDetails: boolean;
  onShowDetailsChange: (show: boolean) => void;
  onStartPause: () => void;
  onReset: () => void;
  className?: string;
}

export function ConsultationTimerUI({
  seconds,
  isRunning,
  showDetails,
  onShowDetailsChange,
  onStartPause,
  onReset,
  className,
}: ConsultationTimerUIProps) {
  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const getTimeColor = () => {
    if (seconds < 600) return "text-success";
    if (seconds < 1200) return "text-warning";
    return "text-destructive";
  };

  return (
    <Popover open={showDetails} onOpenChange={onShowDetailsChange}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "gap-2 font-mono tabular-nums",
                  isRunning && "animate-pulse",
                  className,
                )}
              >
                <Timer className={cn("h-4 w-4", getTimeColor())} />
                <span className={cn("font-medium", getTimeColor())}>
                  {formatTime(seconds)}
                </span>
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Consultation timer</p>
          </TooltipContent>
        </Tooltip>

        <PopoverContent className="w-64 p-4" align="end">
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                Consultation Time
              </p>
              <p
                className={cn(
                  "text-[var(--fs-3xl)] font-semibold font-mono tabular-nums leading-[var(--lh-tight)]",
                  getTimeColor(),
                )}
              >
                {formatTime(seconds)}
              </p>
              <Badge
                variant={isRunning ? "default" : "secondary"}
                className="mt-2"
              >
                {isRunning ? "Running" : "Paused"}
              </Badge>
            </div>

            <div className="flex justify-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isRunning ? "outline" : "default"}
                    size="sm"
                    onClick={onStartPause}
                    className="gap-1"
                  >
                    {isRunning ? (
                      <>
                        <Pause className="h-3 w-3" /> Pause
                      </>
                    ) : (
                      <>
                        <Play className="h-3 w-3" /> Resume
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isRunning ? "Pause" : "Resume"}
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onReset}
                    className="gap-1"
                  >
                    <RotateCcw className="h-3 w-3" /> Reset
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Reset timer</TooltipContent>
              </Tooltip>
            </div>

            <div className="border-t pt-3 space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Avg. consultation
                </span>
                <span className="font-medium">12-15 min</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Billable time</span>
                <span className="font-medium text-foreground">
                  {Math.ceil(seconds / 60)} min
                </span>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
  );
}
