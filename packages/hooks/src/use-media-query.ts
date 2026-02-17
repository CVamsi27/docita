"use client";

import { useEffect, useState } from "react";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQueryList = window.matchMedia(query);
    const updateMatch = () => setMatches(mediaQueryList.matches);

    updateMatch();
    mediaQueryList.addEventListener("change", updateMatch);

    return () => {
      mediaQueryList.removeEventListener("change", updateMatch);
    };
  }, [query]);

  return matches;
}
