import { FC } from "react";
import { useTranslation } from "react-i18next";
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

export const LabTestsOverview: FC<LabTestsOverviewProps> = ({ stats }) => {
  const { t } = useTranslation("LabTests");
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t("overview.pendingTitle")}</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
            {stats?.pending ?? 0}
          </div>
          <p className="text-xs text-muted-foreground">{t("overview.pendingHelper")}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t("overview.inProgressTitle")}</CardTitle>
          <FlaskConical className="h-4 w-4 text-info" />
        </CardHeader>
        <CardContent>
          <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)] text-info">
            {stats?.inProgress ?? 0}
          </div>
          <p className="text-xs text-muted-foreground">{t("overview.inProgressHelper")}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t("overview.completedTitle")}</CardTitle>
          <CheckCircle className="h-4 w-4 text-success" />
        </CardHeader>
        <CardContent>
          <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)] text-success">
            {stats?.completed ?? 0}
          </div>
          <p className="text-xs text-muted-foreground">{t("overview.completedHelper")}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t("overview.urgentTitle")}</CardTitle>
          <AlertCircle className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)] text-destructive">
            {stats?.urgent ?? 0}
          </div>
          <p className="text-xs text-muted-foreground">{t("overview.urgentHelper")}</p>
        </CardContent>
      </Card>
    </div>
  );
};
