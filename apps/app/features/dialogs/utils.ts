import { ConfirmVariant } from "./types";

export const getVariantStyles = (variant: ConfirmVariant = "default") => {
  switch (variant) {
    case "destructive":
      return "bg-red-600 hover:bg-red-700 text-white";
    case "warning":
      return "bg-amber-600 hover:bg-amber-700 text-white";
    case "success":
      return "bg-green-600 hover:bg-green-700 text-white";
    default:
      return "";
  }
};
