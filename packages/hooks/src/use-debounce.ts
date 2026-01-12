"use client";

import { useCallback, useRef, useSyncExternalStore } from "react";

/**
 * Hook to debounce a value.
 *
 * Returns a debounced version of the value that only updates
 * after the specified delay has passed without the value changing.
 *
 * @param value - The value to debounce
 * @param delay - The debounce delay in milliseconds (default: 500)
 * @returns The debounced value
 *
 * @example
 * ```tsx
 * function SearchInput() {
 *   const [search, setSearch] = useState('');
 *   const debouncedSearch = useDebounce(search, 300);
 *
 *   useEffect(() => {
 *     // Only fires 300ms after user stops typing
 *     fetchResults(debouncedSearch);
 *   }, [debouncedSearch]);
 *
 *   return <input value={search} onChange={e => setSearch(e.target.value)} />;
 * }
 * ```
 */
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
