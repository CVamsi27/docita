import { FC } from "react";
import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { AlertCircle, CheckCircle, Clock, FlaskConical } from "lucide-react";

interface LabTestsOverviewProps {
  stats: {
    pending: number;
    inProgress: number;
    completed: number;
    urgent: number;
  };
}

/**
 * Phase 3 (per-feature): apps/app Lab tests > Overview
 * (4 stat cards). 8 literals converted to
 * useTranslations("LabTests.overview").
 */
function useLabOverviewTranslations() {
  return useTranslations("LabTests.overview");
}

export const LabTestsOverview: FC<LabTestsOverviewProps> = ({ stats }) => {
  const t = useLabOverviewTranslations();
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t("pendingTitle")}</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
            {stats?.pending ?? 0}
          </div>
          <p className="text-xs text-muted-foreground">{t("pendingHelper")}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t("inProgressTitle")}</CardTitle>
          <FlaskConical className="h-4 w-4 text-info" />
        </CardHeader>
        <CardContent>
          <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)] text-info">
            {stats?.inProgress ?? 0}
          </div>
          <p className="text-xs text-muted-foreground">{t("inProgressHelper")}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t("completedTitle")}</CardTitle>
          <CheckCircle className="h-4 w-4 text-success" />
        </CardHeader>
        <CardContent>
          <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)] text-success">
            {stats?.completed ?? 0}
          </div>
          <p className="text-xs text-muted-foreground">{t("completedHelper")}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t("urgentTitle")}</CardTitle>
          <AlertCircle className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)] text-destructive">
            {stats?.urgent ?? 0}
          </div>
          <p className="text-xs text-muted-foreground">{t("urgentHelper")}</p>
        </CardContent>
      </Card>
    </div>
  );
};
