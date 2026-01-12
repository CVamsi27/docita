import * as React from "react";
import { ConsultationTimerUI } from "./ConsultationTimerUI";

interface ConsultationTimerContainerProps {
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

export function ConsultationTimerContainer({
  appointmentId,
  onTimeUpdate,
  autoStart = true,
  className,
}: ConsultationTimerContainerProps) {
  const [seconds, setSeconds] = React.useState(0);
  const [isRunning, setIsRunning] = React.useState(false);
  const [showDetails, setShowDetails] = React.useState(false);
  const timerRef = React.useRef<TimerState | null>(null);
  const intervalRef = React.useRef<NodeJS.Timeout | null>(null);

  // Initialize timer from storage or start new
  React.useEffect(() => {
    const stored = getStoredTimer(appointmentId);

    if (stored) {
      timerRef.current = stored;
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
      timerRef.current.isPaused = true;
      timerRef.current.pauseStartTime = Date.now();
      storeTimer(timerRef.current);
      setIsRunning(false);
    } else {
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

  return (
    <ConsultationTimerUI
      seconds={seconds}
      isRunning={isRunning}
      showDetails={showDetails}
      onShowDetailsChange={setShowDetails}
      onStartPause={handleStartPause}
      onReset={handleReset}
      className={className}
    />
  );
}
