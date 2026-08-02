import React, { FC } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/indicators/card";
import { Activity, BedDouble, Calendar, Users } from "lucide-react";

interface Ward {
  id: string;
  name: string;
  floor: string;
}

interface Bed {
  id: string;
  bedNumber: string;
  status: string;
  wardId: string;
}

export interface IpdDashboardProps {
  wards?: Ward[];
  beds?: Bed[];
}

export const IpdDashboard: FC<IpdDashboardProps> = ({
  wards = [],
  beds = [],
}) => {
  const { t } = useTranslation("Ipd");
  const occupiedCount = beds.filter((b) => b.status === "occupied").length;
  const dischargesCount = 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-none shadow-md">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="h-10 w-10 rounded-lg bg-info flex items-center justify-center text-info">
              <BedDouble className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
                {beds.length}
              </p>
              <p className="text-xs text-muted-foreground">{t("dashboard.totalBeds")}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="h-10 w-10 rounded-lg bg-success flex items-center justify-center text-success">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
                {occupiedCount}
              </p>
              <p className="text-xs text-muted-foreground">{t("dashboard.admitted")}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="h-10 w-10 rounded-lg bg-warning flex items-center justify-center text-warning">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
                {dischargesCount}
              </p>
              <p className="text-xs text-muted-foreground">{t("dashboard.dischargesToday")}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center text-primary">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
                {wards.length}
              </p>
              <p className="text-xs text-muted-foreground">{t("dashboard.wards")}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-md">
        <CardHeader>
          <CardTitle>{t("dashboard.wardOverview")}</CardTitle>
          <CardDescription>{t("dashboard.wardOverviewDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          {wards.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {t("dashboard.noWards")}
            </p>
          ) : (
            <div className="space-y-4">
              {wards.map((ward) => {
                const wardBeds = beds.filter((b) => b.wardId === ward.id);
                const occupancy = wardBeds.filter(
                  (b) => b.status === "occupied",
                ).length;
                return (
                  <div
                    key={ward.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                  >
                    <div>
                      <p className="font-medium">{ward.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {t("dashboard.floor", { floor: ward.floor })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {t("dashboard.occupancy", { occupied: occupancy, total: wardBeds.length })}
                      </p>
                      <p className="text-sm text-muted-foreground">{t("dashboard.occupied")}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
