import type { ButtonProps } from "@workspace/ui/components/form/button";
import type { ConfirmVariant } from "./types";

type ButtonVariant = NonNullable<ButtonProps["variant"]>;

/** Maps confirm/alert dialog variants to Button `variant` — avoids outline/default utilities overriding semantic colors in dark mode. */
export const getConfirmButtonVariant = (
  variant: ConfirmVariant = "default",
): ButtonVariant => {
  switch (variant) {
    case "destructive":
      return "destructive";
    case "warning":
      return "warning";
    default:
      return "default";
  }
};

export const getVariantStyles = (variant: ConfirmVariant = "default") => {
  switch (variant) {
    case "success":
      return "bg-success hover:bg-success/90 text-success-foreground";
    default:
      return "";
  }
};
