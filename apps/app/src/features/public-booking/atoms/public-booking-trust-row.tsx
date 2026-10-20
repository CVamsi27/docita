"use client";

import { useTranslation } from "react-i18next";
import { Lock, Shield } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";

/**
 * Assurance badges shown to patients mid-booking. The visible words are the
 * accessible content, so there is no `aria-label` here — on a plain `div` it
 * would be discarded anyway, and it previously restated the same words in a
 * language the Hindi booking flow never switched.
 */
// jscpd:ignore-start — the optional-className + useTranslation + cn() shell
// preamble is shared with unrelated components (SlotTimesSkeletonGrid); there
// is no abstraction worth extracting from two independent presentational atoms.
export function PublicBookingTrustRow({ className }: { className?: string }) {
  const { t } = useTranslation("PublicBooking");

  return (
    <div
      className={cn(
        "inline-flex max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-[length:var(--fs-2xs)] text-muted-foreground",
        className,
      )}
    >
      <span className="inline-flex items-center gap-1">
        <Shield className="h-3 w-3 shrink-0" aria-hidden />
        {t("trustRow.encrypted")}
      </span>
      <span aria-hidden className="select-none">
        ·
      </span>
      <span className="inline-flex items-center gap-1">
        <Lock className="h-3 w-3 shrink-0" aria-hidden />
        {t("trustRow.private")}
      </span>
    </div>
  );
}
// jscpd:ignore-end
