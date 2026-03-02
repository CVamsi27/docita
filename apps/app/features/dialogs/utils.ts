import { ConfirmVariant } from "./types";

export const getVariantStyles = (variant: ConfirmVariant = "default") => {
  switch (variant) {
    case "destructive":
      return "btn-danger";
    case "warning":
      return "btn-warning";
    case "success":
      return "bg-success hover:bg-success/90 text-success-foreground";
    default:
      return "";
  }
};
