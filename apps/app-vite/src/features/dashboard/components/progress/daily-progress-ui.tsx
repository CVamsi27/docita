import { useTranslation } from "react-i18next";
import { Sparkles, Zap } from "lucide-react";
import { Badge, Card, CardContent } from "@workspace/ui/components";

interface DailyProgressUIProps {
  completedToday: number;
  totalAppointments: number;
  uncodedVisits: number;
}

export function DailyProgressUI({
  completedToday,
  totalAppointments,
  uncodedVisits,
}: DailyProgressUIProps) {
  const { t } = useTranslation("Dashboard");
  return (
    <Card className="border border-border shadow-sm bg-card">
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border/70 bg-background/70 text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <p className="font-medium text-sm">{t("progress.title")}</p>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{t("progress.appointments")}</span>
              <span className="font-medium">
                {completedToday}/{totalAppointments}
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-linear-to-r from-primary to-primary/60 transition-colors duration-150"
                style={{
                  width: `${
                    totalAppointments > 0
                      ? (completedToday / totalAppointments) * 100
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 text-warning" />
              <span className="text-xs text-muted-foreground">
                {t("progress.pendingCodes")}
              </span>
            </div>
            <Badge
              variant={uncodedVisits > 0 ? "secondary" : "outline"}
              className="text-xs h-5"
            >
              {uncodedVisits}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
