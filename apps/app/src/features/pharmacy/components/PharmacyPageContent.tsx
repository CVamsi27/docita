"use client";

// jscpd:ignore-start
import { AppPageScaffold, Card, CardContent, CardHeader, CardTitle, EmptyState, PageHeader } from "@workspace/ui/components";
import { Feature } from "@workspace/types";
import { useTranslation } from "react-i18next";
import { ClipboardList, Pill } from "lucide-react";
import { PageFeatureGate } from "@/components/auth/PageFeatureGate";

function usePharmacyPageTranslations() {
  const { t } = useTranslation("Pharmacy");
  return t;
}

export function PharmacyPageContent() {
// jscpd:ignore-end
  const t = usePharmacyPageTranslations();
  return (
    <PageFeatureGate
      feature={Feature.INVENTORY}
      title={t("page.pageTitle")}
      description={t("page.pageDescription")}
    >
      <AppPageScaffold
        header={
          <PageHeader
            title={t("page.pageTitle")}
            description={t("page.pageDescription")}
          />
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="ui-card-surface">
            <CardHeader className="pb-2">
              <p className="ui-eyebrow">{t("page.waitingLabel")}</p>
            </CardHeader>
            <CardContent>
              <p className="ui-money text-[var(--fs-3xl)]">—</p>
              <p className="ui-helper-text mt-1">{t("page.awaitingBackendLabel")}</p>
            </CardContent>
          </Card>
          <Card className="ui-card-surface">
            <CardHeader className="pb-2">
              <p className="ui-eyebrow">{t("page.belowParLabel")}</p>
            </CardHeader>
            <CardContent>
              <p className="ui-money text-[var(--fs-3xl)]">—</p>
              <p className="ui-helper-text mt-1">{t("page.awaitingBackendLabel")}</p>
            </CardContent>
          </Card>
          <Card className="ui-card-surface">
            <CardHeader className="pb-2">
              <p className="ui-eyebrow">{t("page.outOfStockLabel")}</p>
            </CardHeader>
            <CardContent>
              <p className="ui-money text-[var(--fs-3xl)]">—</p>
              <p className="ui-helper-text mt-1">{t("page.awaitingBackendLabel")}</p>
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
              {t("page.dispenseQueueTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={Pill}
              title={t("page.emptyTitle")}
              description={t("page.emptyDescription")}
              action={{ label: t("page.emptyAction"), href: "/inventory" }}
            />
          </CardContent>
        </Card>
      </AppPageScaffold>
    </PageFeatureGate>
  );
}
