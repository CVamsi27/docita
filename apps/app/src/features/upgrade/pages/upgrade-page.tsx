import { Navigate } from "react-router";
import { SUBSCRIPTION_SETTINGS_PATH } from "@/lib/subscription/subscription-settings-path";

export function UpgradePage() {
  return <Navigate to={SUBSCRIPTION_SETTINGS_PATH} replace />;
}
