import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { CalendarDays } from "lucide-react";
import { AppPageScaffold, Button } from "@workspace/ui/components";
import { SUBSCRIPTION_SETTINGS_PATH } from "@/lib/subscription/subscription-settings-path";

export function AppointmentsUpgradeFallback() {
  const { t } = useTranslation("Appointments");
  return (
    <AppPageScaffold>
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/70 bg-card/50 p-8 text-center min-h-[50vh]">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-border/70 bg-background/70">
          <CalendarDays className="h-7 w-7 text-primary" />
        </div>
        <h2 className="ui-section-title mb-2">{t("upgradeFallback.title")}</h2>
        <p className="ui-page-subtitle mb-5 max-w-md">
          {t("upgradeFallback.description")}
        </p>
        <Button asChild>
          <Link to={SUBSCRIPTION_SETTINGS_PATH}>{t("upgradeFallback.upgradeButton")}</Link>
        </Button>
      </div>
    </AppPageScaffold>
  );
}
