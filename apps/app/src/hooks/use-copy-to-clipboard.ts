import { useCallback, useRef, useState } from "react";

/**
 * Provides a `copied` boolean that flips to `true` when `copy(text, title?)`
 * succeeds and resets to `false` after `resetMs` (default 2000ms).
 *
 * Falls back from `navigator.share` → `navigator.clipboard.writeText` and
 * silently swallows AbortError (user-cancelled share dialogs).
 * Pass `title` when calling `navigator.share` to show a share dialog title.
 */
export function useCopyToClipboard(resetMs = 2000) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const copy = useCallback(
    async (text: string, title?: string) => {
      try {
        if (navigator.share) {
          await navigator.share(title ? { title, text } : { text });
        } else {
          await navigator.clipboard.writeText(text);
        }
        clearTimer();
        setCopied(true);
        timerRef.current = setTimeout(() => setCopied(false), resetMs);
      } catch (error) {
        // User cancelled the share dialog — not an error
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        // Fallback: try clipboard API directly
        try {
          await navigator.clipboard.writeText(text);
          clearTimer();
          setCopied(true);
          timerRef.current = setTimeout(() => setCopied(false), resetMs);
        } catch {
          // Silent — caller can inspect `copied` to know if it failed
        }
      }
    },
    [clearTimer, resetMs],
  );

  return { copied, copy };
}
