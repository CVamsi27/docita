import * as React from "react";
import { ArrowLeft } from "lucide-react";

import { cn } from "@workspace/ui/lib/utils";
import { Button, type ButtonProps } from "@workspace/ui/components/button";

export interface BackButtonProps {
  onBack: () => void;
  label?: string;
  iconOnly?: boolean;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
  ariaLabel?: string;
  disabled?: boolean;
  iconClassName?: string;
}

export function BackButton({
  onBack,
  label = "Back",
  iconOnly = false,
  variant = "ghost",
  size = "sm",
  className,
  ariaLabel,
  disabled,
  iconClassName,
}: BackButtonProps) {
  const resolvedAriaLabel = ariaLabel ?? (iconOnly ? label : undefined);
  const resolvedSize = iconOnly && size === "sm" ? "icon-sm" : size;

  return (
    <Button
      type="button"
      variant={variant}
      size={resolvedSize}
      onClick={onBack}
      disabled={disabled}
      aria-label={resolvedAriaLabel}
      className={cn(className)}
    >
      <ArrowLeft
        className={cn("h-4 w-4", !iconOnly && "mr-1.5", iconClassName)}
        aria-hidden="true"
      />
      {iconOnly ? null : <span>{label}</span>}
    </Button>
  );
}
