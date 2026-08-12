"use client";

import { useEffect, useRef } from "react";

/**
 * Runs `callback` on a fixed `intervalMs` cadence. The interval is cleared on
 * unmount and when `intervalMs` changes. Passing `null` pauses the interval
 * (e.g. while a tab is hidden or a poll target is absent). Always uses the
 * latest callback, so closures never go stale.
 */
export function useInterval(
  callback: () => void,
  intervalMs: number | null,
): void {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (intervalMs === null) return;
    const id = setInterval(() => savedCallback.current(), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
}
