"use client";

// jscpd:ignore-start
import { AlertCircle, Calendar, LayoutGrid, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { AppPageScaffold, Button, Card, CardContent, CardHeader, CardTitle, DataState, PageHeader } from "@workspace/ui/components";

/**
 * Phase 3 (per-feature): apps/app Dev Tools > UI contract visual test page.
 * 5 literals converted to useTranslations("DevTools.UiContractVisualTest").
 */
function useUiContractVisualTestTranslations() {
  return useTranslations("DevTools.UiContractVisualTest");
}

export default function UiContractVisualTestPage() {
  const t = useUiContractVisualTestTranslations();
  return (
    <div className="space-y-10 p-6 md:p-8">
      <section data-testid="scaffold-and-header">
        <AppPageScaffold
          header={
            <PageHeader
              title={t("pageTitle")}
              description={t("pageSubtitle")}
              actions={
                <Button size="sm">
                  <Plus className="h-4 w-4" />
                  {t("newEntryButton")}
                </Button>
              }
            />
          }
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t("todayTitle")}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {t("todayBody", { count: 8 })}
              </CardContent>
            </Card>
            <Card interaction="interactive">
              <CardHeader>
                <CardTitle>{t("queueTitle")}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {t("queueBody", { count: 3 })}
              </CardContent>
            </Card>
          </div>
        </AppPageScaffold>
      </section>

      <section data-testid="data-state-loading">
        <Card>
          <CardHeader>
            <CardTitle>{t("loadingTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <DataState
              status="loading"
              loadingMessage={t("loadingMessage")}
            />
          </CardContent>
        </Card>
      </section>

      <section data-testid="data-state-empty">
        <Card>
          <CardHeader>
            <CardTitle>{t("emptyTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <DataState
              status="empty"
              emptyIcon={Calendar}
              emptyTitle={t("emptyStateTitle")}
              emptyDescription={t("emptyStateDescription")}
              emptyAction={{ label: t("emptyAction"), href: "#" }}
            />
          </CardContent>
        </Card>
      </section>

      <section data-testid="data-state-error">
        <Card>
          <CardHeader>
            <CardTitle>{t("errorTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <DataState
              status="error"
              errorMessage={t("errorMessage")}
            />
          </CardContent>
        </Card>
      </section>

      <section data-testid="interactive-card">
        <Card interaction="interactive" className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4" />
              {t("interactiveCardTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {t("interactiveCardBody")}
          </CardContent>
        </Card>
      </section>

      <section data-testid="error-inline">
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <p className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {t("inlineAlertLabel")}
          </p>
        </div>
      </section>
    </div>
  );
}
// jscpd:ignore-end
