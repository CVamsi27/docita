"use client";

import { useEffect, useRef } from "react";

/**
 * Runs `callback` once after `delayMs`. The timer is cleared on unmount and
 * when `delayMs` changes, so a component can safely reschedule without
 * leaking timers. Passing `null` disables the timeout.
 */
export function useTimeout(
  callback: () => void,
  delayMs: number | null,
): void {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delayMs === null) return;
    const id = setTimeout(() => savedCallback.current(), delayMs);
    return () => clearTimeout(id);
  }, [delayMs]);
}
