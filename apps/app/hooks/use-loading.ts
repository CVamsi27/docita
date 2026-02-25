"use client";

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

export function useLoading(options: UseLoadingOptions = {}) {
  const [state, setState] = useState<LoadingState>({
    isLoading: false,
    loadingText: undefined,
    progress: undefined,
  });

  const startTimeRef = useRef<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const minDuration = options.minDuration || 300;
  const maxDuration = options.maxDuration || 30000;

  const stopLoading = useCallback(async () => {
    if (!startTimeRef.current) {
      setState({
        isLoading: false,
        loadingText: undefined,
        progress: undefined,
      });
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

    setState({ isLoading: false, loadingText: undefined, progress: undefined });
    startTimeRef.current = null;
  }, [minDuration]);

  const startLoading = useCallback(
    (text?: string) => {
      startTimeRef.current = Date.now();
      setState({ isLoading: true, loadingText: text, progress: undefined });

      if (maxDuration && options.onTimeout) {
        timeoutRef.current = setTimeout(() => {
          options.onTimeout?.();
          stopLoading();
        }, maxDuration);
      }
    },
    [maxDuration, options, stopLoading],
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

export function withLoading<T extends (...args: never[]) => Promise<unknown>>(
  fn: T,
  loadingHandlers: {
    startLoading: (text?: string) => void;
    stopLoading: () => Promise<void>;
  },
  loadingText?: string,
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  return async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    loadingHandlers.startLoading(loadingText);
    try {
      const result = await fn(...args);
      return result as Awaited<ReturnType<T>>;
    } finally {
      await loadingHandlers.stopLoading();
    }
  };
}
