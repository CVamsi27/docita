import * as React from "react";
import { cn } from "../../lib/utils";

export type CategoryAvatarTone =
  | "info"
  | "success"
  | "warning"
  | "destructive"
  | "primary"
  | "neutral";

export interface CategoryAvatarProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  icon: React.ReactNode;
  tone?: CategoryAvatarTone;
  size?: "sm" | "md" | "lg";
  ariaLabel?: string;
}

const TONE_CLASSES: Record<CategoryAvatarTone, string> = {
  info: "bg-info/15 text-info",
  success: "bg-success/15 text-success",
  warning: "bg-warning/20 text-warning",
  destructive: "bg-destructive/15 text-destructive",
  primary: "bg-primary/15 text-primary",
  neutral: "bg-muted text-muted-foreground",
};

const SIZE_CLASSES: Record<NonNullable<CategoryAvatarProps["size"]>, string> = {
  sm: "size-7 [&>*]:size-3.5",
  md: "size-9 [&>*]:size-4",
  lg: "size-11 [&>*]:size-5",
};

/**
 * Tinted circle with an icon — used for medication classes, lab categories,
 * document types, follow-up reasons. Always pair with a textual label for a11y.
 */
export function CategoryAvatar({
  icon,
  tone = "neutral",
  size = "md",
  className,
  ariaLabel,
  ...rest
}: CategoryAvatarProps) {
  return (
    <span
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full",
        SIZE_CLASSES[size],
        TONE_CLASSES[tone],
        className,
      )}
      {...rest}
    >
      {icon}
    </span>
  );
}
