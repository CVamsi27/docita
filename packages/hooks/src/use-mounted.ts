"use client";

import { useEffect, useState } from "react";

/**
 * Hook to check if component is mounted (client-side).
 *
 * Useful for avoiding hydration mismatches when rendering
 * content that depends on client-side state.
 *
 * @returns true if component is mounted, false during SSR
 *
 * @example
 * ```tsx
 * function ClientOnlyComponent() {
 *   const isMounted = useMounted();
 *
 *   if (!isMounted) {
 *     return <Skeleton />;
 *   }
 *
 *   return <div>{window.innerWidth}px</div>;
 * }
 * ```
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Use setTimeout to avoid cascading renders
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  return mounted;
}
