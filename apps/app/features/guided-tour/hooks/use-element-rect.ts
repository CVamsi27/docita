"use client";

import { useEffect, useState } from "react";

export interface ElementRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function toRect(el: Element): ElementRect {
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

/**
 * Resolves `selector` — polling briefly for late-mounted targets (several
 * `/today` widgets are `dynamic ssr:false`) — and tracks its viewport rect
 * across scroll/resize. Returns `null` when no selector is given or the element
 * never appears within `timeoutMs`, so the caller can render a centered card.
 */
export function useElementRect(
  selector: string | null | undefined,
  timeoutMs = 4000,
): ElementRect | null {
  const [rect, setRect] = useState<ElementRect | null>(null);

  useEffect(() => {
    if (!selector) {
      setRect(null);
      return;
    }

    let cancelled = false;
    let raf = 0;
    let target: Element | null = null;
    const deadline = Date.now() + timeoutMs;

    const measure = () => {
      if (target) setRect(toRect(target));
    };

    const onScrollResize = () => measure();

    const poll = () => {
      if (cancelled) return;
      target = document.querySelector(selector);
      if (target) {
        measure();
        window.addEventListener("scroll", onScrollResize, true);
        window.addEventListener("resize", onScrollResize);
        return;
      }
      if (Date.now() > deadline) {
        setRect(null);
        return;
      }
      raf = requestAnimationFrame(poll);
    };

    poll();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScrollResize, true);
      window.removeEventListener("resize", onScrollResize);
    };
  }, [selector, timeoutMs]);

  return rect;
}
