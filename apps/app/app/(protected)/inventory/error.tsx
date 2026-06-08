"use client";

// jscpd:ignore-start
import { ErrorPageShell } from "@/components/errors/error-page-shell";

export default function InventoryError({
  _error,
  reset,
}: {
  _error: Error & { digest?: string };
  reset: () => void;
}) {

  return (
    <ErrorPageShell
      title="Error loading Inventory"
// jscpd:ignore-end
      description="We couldn't load Inventory. Please retry or return to the dashboard."
      reset={reset}
    />
  );
}
