"use client";

import { Lock, Shield } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";

export function PublicBookingTrustRow({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "inline-flex max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-[length:var(--fs-2xs)] text-muted-foreground",
        className,
      )}
      aria-label="Security and privacy"
    >
      <span className="inline-flex items-center gap-1">
        <Shield className="h-3 w-3 shrink-0" aria-hidden />
        Encrypted
      </span>
      <span aria-hidden className="select-none">
        ·
      </span>
      <span className="inline-flex items-center gap-1">
        <Lock className="h-3 w-3 shrink-0" aria-hidden />
        Private
      </span>
    </div>
  );
}
