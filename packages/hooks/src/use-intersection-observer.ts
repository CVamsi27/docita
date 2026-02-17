"use client";

import { useEffect, useState } from "react";

interface UseIntersectionObserverOptions extends IntersectionObserverInit {
  enabled?: boolean;
}

export function useIntersectionObserver<T extends Element>(
  ref: React.RefObject<T | null>,
  options: UseIntersectionObserverOptions = {},
): boolean {
  const { enabled = true, ...observerOptions } = options;
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    if (!enabled || !ref.current || typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry) {
        return;
      }

      setIsIntersecting(entry.isIntersecting);
    }, observerOptions);

    observer.observe(ref.current);

    return () => {
      observer.disconnect();
    };
  }, [enabled, observerOptions, ref]);

  return isIntersecting;
}
