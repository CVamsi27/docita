import { redirect } from "next/navigation";
import { SUBSCRIPTION_SETTINGS_PATH } from "@/lib/subscription/subscription-settings-path";

export default function UpgradePage() {
  redirect(SUBSCRIPTION_SETTINGS_PATH);
}
