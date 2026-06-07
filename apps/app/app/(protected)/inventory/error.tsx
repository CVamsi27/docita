"use client";

import { ErrorPageShell } from "@/components/errors/error-page-shell";

export default function InventoryError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {

  return (
    <ErrorPageShell
      title="Error loading Inventory"
      description="We couldn't load Inventory. Please retry or return to the dashboard."
      reset={reset}
    />
  );
}
