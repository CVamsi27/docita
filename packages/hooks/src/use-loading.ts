import { useCallback, useEffect, useRef, useState } from "react";

export interface LoadingState {
  isLoading: boolean;
  loadingText?: string;
  progress?: number;
}

interface UseLoadingOptions {
  minDuration?: number;
  maxDuration?: number;
  onTimeout?: () => void;
}

const IDLE_STATE: LoadingState = { isLoading: false };

export function useLoading(options: UseLoadingOptions = {}) {
  const [state, setState] = useState<LoadingState>(IDLE_STATE);

  const startTimeRef = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const minDuration = options.minDuration ?? 300;
  const maxDuration = options.maxDuration ?? 30000;
  const onTimeout = options.onTimeout;

  const stopLoading = useCallback(async () => {
    if (!startTimeRef.current) {
      setState(IDLE_STATE);
      return;
    }

    const elapsed = Date.now() - startTimeRef.current;
    const remaining = minDuration - elapsed;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (remaining > 0) {
      await new Promise((resolve) => setTimeout(resolve, remaining));
    }

    setState(IDLE_STATE);
    startTimeRef.current = null;
  }, [minDuration]);

  const startLoading = useCallback(
    (text?: string) => {
      startTimeRef.current = Date.now();
      const next: LoadingState = { isLoading: true };
      if (text !== undefined) {
        next.loadingText = text;
      }
      setState(next);

      if (maxDuration && onTimeout) {
        timeoutRef.current = setTimeout(() => {
          onTimeout();
          stopLoading();
        }, maxDuration);
      }
    },
    [maxDuration, onTimeout, stopLoading],
  );

  const setProgress = useCallback((progress: number) => {
    setState((prev) => ({
      ...prev,
      progress: Math.max(0, Math.min(100, progress)),
    }));
  }, []);

  const setLoadingText = useCallback((text: string) => {
    setState((prev) => ({ ...prev, loadingText: text }));
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    ...state,
    startLoading,
    stopLoading,
    setProgress,
    setLoadingText,
  };
}

export function withLoading<TArgs extends readonly unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  loadingHandlers: {
    startLoading: (text?: string) => void;
    stopLoading: () => Promise<void>;
  },
  loadingText?: string,
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs): Promise<TResult> => {
    loadingHandlers.startLoading(loadingText);
    try {
      return await fn(...args);
    } finally {
      await loadingHandlers.stopLoading();
    }
  };
}
