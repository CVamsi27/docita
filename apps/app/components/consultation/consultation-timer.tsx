"use client";

import * as React from "react";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import { Timer, Play, Pause, RotateCcw, Clock } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";

interface ConsultationTimerProps {
  appointmentId: string;
  onTimeUpdate?: (seconds: number) => void;
  autoStart?: boolean;
  className?: string;
}

const STORAGE_KEY = "docita_consultation_timer";

interface TimerState {
  appointmentId: string;
  startTime: number;
  pausedDuration: number;
  isPaused: boolean;
  pauseStartTime?: number;
}

function getStoredTimer(appointmentId: string): TimerState | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY}_${appointmentId}`);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function storeTimer(timer: TimerState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      `${STORAGE_KEY}_${timer.appointmentId}`,
      JSON.stringify(timer),
    );
  } catch {
    // Ignore storage errors
  }
}

function clearStoredTimer(appointmentId: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(`${STORAGE_KEY}_${appointmentId}`);
  } catch {
    // Ignore storage errors
  }
}

export function ConsultationTimer({
  appointmentId,
  onTimeUpdate,
  autoStart = true,
  className,
}: ConsultationTimerProps) {
  const [seconds, setSeconds] = React.useState(0);
  const [isRunning, setIsRunning] = React.useState(false);
  const [showDetails, setShowDetails] = React.useState(false);
  const timerRef = React.useRef<TimerState | null>(null);
  const intervalRef = React.useRef<NodeJS.Timeout | null>(null);

  // Initialize timer from storage or start new
  React.useEffect(() => {
    const stored = getStoredTimer(appointmentId);

    if (stored) {
      // Resume existing timer
      timerRef.current = stored;

      const now = Date.now();
      let elapsed = Math.floor((now - stored.startTime) / 1000);

      // Subtract paused duration
      elapsed -= Math.floor(stored.pausedDuration / 1000);

      // If currently paused, subtract time since pause started
      if (stored.isPaused && stored.pauseStartTime) {
        elapsed -= Math.floor((now - stored.pauseStartTime) / 1000);
      }

      setSeconds(Math.max(0, elapsed));
      setIsRunning(!stored.isPaused);
    } else if (autoStart) {
      // Start new timer
      const newTimer: TimerState = {
        appointmentId,
        startTime: Date.now(),
        pausedDuration: 0,
        isPaused: false,
      };
      timerRef.current = newTimer;
      storeTimer(newTimer);
      setIsRunning(true);
    }
  }, [appointmentId, autoStart]);

  // Timer tick
  React.useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSeconds((prev) => {
          const newValue = prev + 1;
          onTimeUpdate?.(newValue);
          return newValue;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, onTimeUpdate]);

  const handleStartPause = () => {
    if (!timerRef.current) {
      // Start new timer
      const newTimer: TimerState = {
        appointmentId,
        startTime: Date.now() - seconds * 1000,
        pausedDuration: 0,
        isPaused: false,
      };
      timerRef.current = newTimer;
      storeTimer(newTimer);
      setIsRunning(true);
    } else if (isRunning) {
      // Pause
      timerRef.current.isPaused = true;
      timerRef.current.pauseStartTime = Date.now();
      storeTimer(timerRef.current);
      setIsRunning(false);
    } else {
      // Resume
      if (timerRef.current.pauseStartTime) {
        timerRef.current.pausedDuration +=
          Date.now() - timerRef.current.pauseStartTime;
        timerRef.current.pauseStartTime = undefined;
      }
      timerRef.current.isPaused = false;
      storeTimer(timerRef.current);
      setIsRunning(true);
    }
  };

  const handleReset = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    const newTimer: TimerState = {
      appointmentId,
      startTime: Date.now(),
      pausedDuration: 0,
      isPaused: false,
    };
    timerRef.current = newTimer;
    storeTimer(newTimer);
    setSeconds(0);
    setIsRunning(true);
  };

  const stopTimer = React.useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    clearStoredTimer(appointmentId);
    timerRef.current = null;
    setIsRunning(false);
  }, [appointmentId]);

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
    if (seconds < 600) return "text-green-600 dark:text-green-400"; // < 10 min
    if (seconds < 1200) return "text-yellow-600 dark:text-yellow-400"; // < 20 min
    return "text-orange-600 dark:text-orange-400"; // > 20 min
  };

  return (
    <TooltipProvider>
      <Popover open={showDetails} onOpenChange={setShowDetails}>
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
            <p>Consultation duration</p>
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
                  "text-3xl font-bold font-mono tabular-nums",
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
                    onClick={handleStartPause}
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
                  {isRunning ? "Pause timer" : "Resume timer"}
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReset}
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
    </TooltipProvider>
  );
}

// Compact version for mobile/smaller screens
export function ConsultationTimerCompact({
  appointmentId,
  onTimeUpdate,
  autoStart = true,
  className,
}: ConsultationTimerProps) {
  const [seconds, setSeconds] = React.useState(0);
  const [isRunning, setIsRunning] = React.useState(false);

  React.useEffect(() => {
    const stored = getStoredTimer(appointmentId);
    if (stored) {
      const now = Date.now();
      let elapsed = Math.floor((now - stored.startTime) / 1000);
      elapsed -= Math.floor(stored.pausedDuration / 1000);
      if (stored.isPaused && stored.pauseStartTime) {
        elapsed -= Math.floor((now - stored.pauseStartTime) / 1000);
      }
      setSeconds(Math.max(0, elapsed));
      setIsRunning(!stored.isPaused);
    } else if (autoStart) {
      const newTimer: TimerState = {
        appointmentId,
        startTime: Date.now(),
        pausedDuration: 0,
        isPaused: false,
      };
      storeTimer(newTimer);
      setIsRunning(true);
    }
  }, [appointmentId, autoStart]);

  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      interval = setInterval(() => {
        setSeconds((prev) => {
          const newValue = prev + 1;
          onTimeUpdate?.(newValue);
          return newValue;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, onTimeUpdate]);

  const formatTimeCompact = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Badge
      variant={isRunning ? "default" : "secondary"}
      className={cn("font-mono tabular-nums", className)}
    >
      <Timer className="h-3 w-3 mr-1" />
      {formatTimeCompact(seconds)}
    </Badge>
  );
}
