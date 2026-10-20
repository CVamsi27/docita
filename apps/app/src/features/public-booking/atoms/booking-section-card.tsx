"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardContent, CardHeader } from "@workspace/ui/components";
import {
  bookingCardClass,
  bookingSectionHeaderBar,
  bookingSectionShell,
} from "./booking-constants";
import { BookingSectionHeader } from "./booking-section-header";
import { cn } from "@workspace/ui/lib/utils";

/**
 * Origin-style outer card used by every public-booking step section
 * (appointment, contact, patient history, verification).
 *
 * These four sections previously repeated the same Card / CardHeader /
 * BookingSectionHeader preamble verbatim; only the body classes differed.
 * Centralising it keeps the section rhythm identical when the shell is tuned,
 * and gives the i18n work one place to change copy.
 */
export function PublicBookingSectionCard({
  icon,
  micro,
  title,
  description,
  tone,
  compactHeader = false,
  cardClassName,
  headerClassName,
  contentClassName,
  children,
}: {
  icon: LucideIcon;
  micro: string;
  title: string;
  description: ReactNode;
  tone?: "info" | "success" | "warning" | "destructive" | "primary" | "neutral";
  compactHeader?: boolean;
  /** Overrides the shared Card classes for sections with extra surface styling. */
  cardClassName?: string;
  /** Overrides the shared CardHeader padding for sections with asymmetric padding. */
  headerClassName?: string;
  contentClassName?: string;
  children: ReactNode;
}) {
  return (
    <Card
      className={cn(
        bookingCardClass,
        bookingSectionShell,
        "flex flex-col",
        cardClassName,
      )}
    >
      <CardHeader
        className={cn(
          bookingSectionHeaderBar,
          headerClassName ??
            (compactHeader ? "py-3 sm:py-4" : "py-4 sm:py-5"),
        )}
      >
        <BookingSectionHeader
          icon={icon}
          micro={micro}
          title={title}
          description={description}
          tone={tone}
          variant={compactHeader ? "compact" : "full"}
        />
      </CardHeader>
      <CardContent className={cn(contentClassName)}>{children}</CardContent>
    </Card>
  );
}