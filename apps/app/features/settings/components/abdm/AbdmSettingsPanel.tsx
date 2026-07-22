"use client";

import { Activity } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { ComingSoonBadge } from "@/components/feedback/coming-soon-badge";

/**
 * Phase 3 (per-feature): apps/app Settings > ABDM integration panel.
 * 5 literals converted to useTranslations("Settings.Abdm").
 */
function useAbdmSettingsTranslations() {
  return useTranslations("Settings.Abdm");
}

/**
 * ABDM integration is under active development. The settings panel shows a
 * preview of what's coming rather than live controls until the gateway
 * certification flow is complete.
 */
export function AbdmSettingsPanel() {
  const t = useAbdmSettingsTranslations();
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Card>
        <CardHeader className="border-b border-border/60 pb-5">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {t("title")}
            <ComingSoonBadge />
          </CardTitle>
          <CardDescription>
            {t("description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-5">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {t("capabilitiesIntro")}
            </p>
            <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
              <li>{t("capabilities.facilityToggle")}</li>
              <li>{t("capabilities.readinessChecklist")}</li>
              <li>{t("capabilities.abhaVerification")}</li>
              <li>{t("capabilities.recordsInbox")}</li>
              <li>{t("capabilities.dhisEstimates")}</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
