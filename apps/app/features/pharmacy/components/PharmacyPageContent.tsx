"use client";

// jscpd:ignore-start
import { AppPageScaffold, Card, CardContent, CardHeader, CardTitle, EmptyState, PageHeader } from "@workspace/ui/components";
import { Feature } from "@workspace/types";
import { useTranslations } from "next-intl";
import { ClipboardList, Pill } from "lucide-react";
import { FeatureGate } from "@/components/auth/feature-gate";

/**
 * Phase 3 (per-feature): apps/app Pharmacy > Page content. 6 literals
 * converted to useTranslations("Pharmacy.page").
 */
function usePharmacyPageTranslations() {
  return useTranslations("Pharmacy.page");
}

export function PharmacyPageContent() {
// jscpd:ignore-end
  const t = usePharmacyPageTranslations();
  return (
    <FeatureGate feature={Feature.INVENTORY} showLockedCard>
      <AppPageScaffold
        header={
          <PageHeader
            title={t("pageTitle")}
            description={t("pageDescription")}
          />
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="ui-card-surface">
            <CardHeader className="pb-2">
              <p className="ui-eyebrow">{t("waitingLabel")}</p>
            </CardHeader>
            <CardContent>
              <p className="ui-money text-[var(--fs-3xl)]">—</p>
              <p className="ui-helper-text mt-1">{t("awaitingBackendLabel")}</p>
            </CardContent>
          </Card>
          <Card className="ui-card-surface">
            <CardHeader className="pb-2">
              <p className="ui-eyebrow">{t("belowParLabel")}</p>
            </CardHeader>
            <CardContent>
              <p className="ui-money text-[var(--fs-3xl)]">—</p>
              <p className="ui-helper-text mt-1">{t("awaitingBackendLabel")}</p>
            </CardContent>
          </Card>
          <Card className="ui-card-surface">
            <CardHeader className="pb-2">
              <p className="ui-eyebrow">{t("outOfStockLabel")}</p>
            </CardHeader>
            <CardContent>
              <p className="ui-money text-[var(--fs-3xl)]">—</p>
              <p className="ui-helper-text mt-1">{t("awaitingBackendLabel")}</p>
            </CardContent>
          </Card>
        </div>
        <Card className="ui-card-surface">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList
                className="size-4 text-muted-foreground"
                aria-hidden
              />
              {t("dispenseQueueTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={Pill}
              title={t("emptyTitle")}
              description={t("emptyDescription")}
              action={{ label: t("emptyAction"), href: "/inventory" }}
            />
          </CardContent>
        </Card>
      </AppPageScaffold>
    </FeatureGate>
  );
}
