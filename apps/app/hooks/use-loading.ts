/**
 * Loading State Management Hook
 *
 * UI/UX IMPROVEMENTS:
 * - Centralized loading state management
 * - Prevents layout shift with skeleton screens
 * - Provides loading feedback for better UX
 * - Handles timing for smooth transitions
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface LoadingState {
  isLoading: boolean;
  loadingText?: string;
  progress?: number; // 0-100 for progress bars
}

interface UseLoadingOptions {
  minDuration?: number; // Minimum loading time (prevents flash)
  maxDuration?: number; // Maximum loading time (timeout)
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

  const minDuration = options.minDuration || 300; // Prevent flash
  const maxDuration = options.maxDuration || 30000; // 30 second timeout

  /**
   * Stop loading state (with minimum duration enforcement)
   */
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

    // Clear timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (remaining > 0) {
      // Wait for minimum duration to prevent flash
      await new Promise((resolve) => setTimeout(resolve, remaining));
    }

    setState({ isLoading: false, loadingText: undefined, progress: undefined });
    startTimeRef.current = null;
  }, [minDuration]);

  /**
   * Start loading state
   */
  const startLoading = useCallback(
    (text?: string) => {
      startTimeRef.current = Date.now();
      setState({ isLoading: true, loadingText: text, progress: undefined });

      // Set timeout if maxDuration specified
      if (maxDuration && options.onTimeout) {
        timeoutRef.current = setTimeout(() => {
          options.onTimeout?.();
          stopLoading();
        }, maxDuration);
      }
    },
    [maxDuration, options, stopLoading],
  );

  /**
   * Set loading progress (for progress bars)
   */
  const setProgress = useCallback((progress: number) => {
    setState((prev) => ({
      ...prev,
      progress: Math.max(0, Math.min(100, progress)),
    }));
  }, []);

  /**
   * Update loading text
   */
  const setLoadingText = useCallback((text: string) => {
    setState((prev) => ({ ...prev, loadingText: text }));
  }, []);

  /**
   * Cleanup on unmount
   */
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

/**
 * Higher-order function to wrap async operations with loading state
 */
export function withLoading<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  loadingHook: ReturnType<typeof useLoading>,
  loadingText?: string,
): T {
  return (async (...args: Parameters<T>) => {
    loadingHook.startLoading(loadingText);
    try {
      const result = await fn(...args);
      return result;
    } finally {
      await loadingHook.stopLoading();
    }
  }) as T;
}

/**
 * Hook for managing multiple concurrent loading states
 */
export function useMultiLoading() {
  const [loadingStates, setLoadingStates] = useState<Map<string, LoadingState>>(
    new Map(),
  );

  const startLoading = useCallback((key: string, text?: string) => {
    setLoadingStates((prev) => {
      const next = new Map(prev);
      next.set(key, { isLoading: true, loadingText: text });
      return next;
    });
  }, []);

  const stopLoading = useCallback((key: string) => {
    setLoadingStates((prev) => {
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
  }, []);

  const isAnyLoading = loadingStates.size > 0;
  const getLoadingState = (key: string) => loadingStates.get(key);

  return {
    loadingStates,
    startLoading,
    stopLoading,
    isAnyLoading,
    getLoadingState,
  };
}
