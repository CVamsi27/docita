"use client";

import React, { FC } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/indicators/card";
import { Activity, BedDouble, Calendar, Users } from "lucide-react";
import { useTranslations } from "next-intl";

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

/**
 * Phase 3 (per-feature): apps/app IPD > Dashboard view
 * (4 stat cards + ward overview). 7 literals converted to
 * useTranslations("Ipd.dashboard").
 */
function useIpdDashboardTranslations() {
  return useTranslations("Ipd.dashboard");
}

export const IpdDashboard: FC<IpdDashboardProps> = ({
  wards = [],
  beds = [],
}) => {
  const t = useIpdDashboardTranslations();
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
              <p className="text-xs text-muted-foreground">{t("totalBedsLabel")}</p>
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
              <p className="text-xs text-muted-foreground">{t("admittedLabel")}</p>
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
              <p className="text-xs text-muted-foreground">{t("dischargesLabel")}</p>
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
              <p className="text-xs text-muted-foreground">{t("wardsLabel")}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-md">
        <CardHeader>
          <CardTitle>{t("wardOverviewTitle")}</CardTitle>
          <CardDescription>{t("wardOverviewDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          {wards.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {t("emptyTitle")}
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
                        {t("floorLabel", { floor: ward.floor })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {t("occupancyValue", { occupied: occupancy, total: wardBeds.length })}
                      </p>
                      <p className="text-sm text-muted-foreground">{t("occupiedLabel")}</p>
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
