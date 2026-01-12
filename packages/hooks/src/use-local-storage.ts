"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Hook for persisting state to localStorage with SSR support.
 *
 * Handles hydration mismatches by reading from localStorage
 * only after component mounts.
 *
 * @param key - The localStorage key
 * @param initialValue - The initial/fallback value
 * @returns Tuple of [value, setValue] similar to useState
 *
 * @example
 * ```tsx
 * function Settings() {
 *   const [theme, setTheme] = useLocalStorage('theme', 'light');
 *
 *   return (
 *     <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}>
 *       Current: {theme}
 *     </button>
 *   );
 * }
 * ```
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  // Get from localStorage after mount (client-side only)
  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        setStoredValue(JSON.parse(item));
      }
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
    }
  }, [key]);

  // Return a wrapped version of useState's setter function that
  // persists the new value to localStorage.
  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        // Allow value to be a function so we have same API as useState
        const valueToStore =
          value instanceof Function ? value(storedValue) : value;
        // Save state
        setStoredValue(valueToStore);
        // Save to localStorage
        if (typeof window !== "undefined") {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue],
  );

  return [storedValue, setValue];
}

/**
 * Hook to read a value from localStorage (read-only).
 *
 * @param key - The localStorage key
 * @returns The stored value or null if not found
 */
export function useReadLocalStorage<T>(key: string): T | null {
  const [value, setValue] = useState<T | null>(null);

  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        setValue(JSON.parse(item));
      }
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
    }
  }, [key]);

  return value;
}

/**
 * Hook to remove a value from localStorage
 *
 * @param key - The localStorage key to remove
 * @returns A function to remove the value
 */
export function useRemoveLocalStorage(key: string): () => void {
  return useCallback(() => {
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error);
    }
  }, [key]);
}
