"use client";

import { Bell } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";

type NotificationBellWithBadgesProps = {
  count: number;
  className?: string;
  iconClassName?: string;
};

/**
 * Bell icon with a primary unread dot (top-left) and numeric count badge (top-right).
 */
export function NotificationBellWithBadges({
  count,
  className,
  iconClassName,
}: NotificationBellWithBadgesProps) {
  const show = count > 0;
  const label = count > 99 ? "99+" : String(count);

  return (
    <span
      className={cn(
        "relative inline-flex size-4 shrink-0 items-center justify-center",
        className,
      )}
    >
      <Bell className={cn("size-4", iconClassName)} aria-hidden />
      {show && (
        <>
          <span
            className="pointer-events-none absolute left-0 top-0 z-[1] h-2 w-2 rounded-full bg-primary shadow-[0_0_0_2px_hsl(var(--background))]"
            aria-hidden
          />
          <span
            className={cn(
              "pointer-events-none absolute right-0 top-0 z-[1] flex min-h-4 min-w-4 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary px-0.5 font-semibold tabular-nums text-[var(--fs-2xs)] text-primary-foreground leading-none",
              label.length > 1 ? "min-w-[1.125rem]" : undefined,
            )}
            aria-hidden
          >
            {label}
          </span>
        </>
      )}
    </span>
  );
}
