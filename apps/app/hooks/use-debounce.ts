import { useSyncExternalStore, useRef, useCallback } from "react";

export function useDebounce<T>(value: T, delay: number = 500): T {
  const valueRef = useRef(value);
  const debouncedRef = useRef(value);
  const subscribersRef = useRef(new Set<() => void>());
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Update the value ref and schedule debounce
  if (valueRef.current !== value) {
    valueRef.current = value;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      debouncedRef.current = value;
      subscribersRef.current.forEach((callback) => callback());
    }, delay);
  }

  const subscribe = useCallback((callback: () => void) => {
    subscribersRef.current.add(callback);
    return () => {
      subscribersRef.current.delete(callback);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const getSnapshot = useCallback(() => debouncedRef.current, []);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
