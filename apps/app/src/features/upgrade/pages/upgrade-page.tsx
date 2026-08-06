import { useTranslation } from "react-i18next";
import { AppPageScaffold, Button, PageHeader } from "@workspace/ui/components";

export function UpgradePage() {
  const { t } = useTranslation("Subscription");
  return <AppPageScaffold header={<PageHeader title={t("upgrade.title")} description={t("upgrade.description")} />}>
    <div className="grid gap-6 md:grid-cols-3 max-w-4xl mx-auto">
      {["Starter", "Professional", "Enterprise"].map((plan) => (
        <div key={plan} className="rounded-lg border p-6 text-center">
          <p className="text-sm font-semibold">{t(`upgrade.plans.${plan}.name`)}</p>
          <p className="mt-2 text-2xl font-bold">{t(`upgrade.plans.${plan}.price`)}</p>
          <p className="text-xs text-muted-foreground mt-1">{t("upgrade.perMonth")}</p>
          <Button className="mt-4 w-full" variant={plan === "Professional" ? "default" : "outline"}>{plan === "Starter" ? t("upgrade.current") : t("upgrade.upgradeButton")}</Button>
        </div>
      ))}
    </div>
  </AppPageScaffold>;
}
