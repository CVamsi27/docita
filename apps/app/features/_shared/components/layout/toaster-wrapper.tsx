"use client";

import { useEffect, useState } from "react";
import { Toaster } from "sonner";

const TOAST_DURATION_MS = 5000;
const TOAST_VISIBLE_COUNT = Number.POSITIVE_INFINITY;

export function ToasterWrapper() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <Toaster
      closeButton
      duration={TOAST_DURATION_MS}
      expand
      richColors
      position="top-right"
      visibleToasts={TOAST_VISIBLE_COUNT}
    />
  );
}
