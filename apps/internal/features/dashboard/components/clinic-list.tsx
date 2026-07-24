"use client";

// jscpd:ignore-start
import { useTranslations } from "next-intl";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/data-display/table";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { EditClinicDialog } from "./edit-clinic-dialog";
import { Building2 } from "lucide-react";
import { mapDbClinicTierStringToTierName, TIER_INFO } from "@workspace/types";
import { getInternalClinicTypeDisplay } from "@/lib/clinic-display";
import { getInternalTierBadgeClass } from "@/lib/tier-display";

/**
 * Phase 3 (per-feature): apps/internal Dashboard > Clinic list
 * (admin facility table). 9 literals converted to
 * useTranslations("InternalDashboard.clinicList").
 */
function useClinicListTranslations() {
  return useTranslations("InternalDashboard.clinicList");
}

function getTierDisplay(tier: string): { name: string; className: string } {
// jscpd:ignore-end
  const normalizedTier = mapDbClinicTierStringToTierName(tier);
  const tierInfo = TIER_INFO[normalizedTier];
  if (tierInfo) {
    return {
      name: tierInfo.name.replace("Docita ", ""),
      className: getInternalTierBadgeClass(normalizedTier),
    };
  }
  return { name: tier, className: "tier-capture" };
}

function getClinicTypeDisplay(type?: string) {
  return getInternalClinicTypeDisplay(type);
}

interface Clinic {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  tier?: string;
  type?: string;
  active?: boolean;
  settings?: Record<string, unknown>;
  _count?: {
    users: number;
    patients: number;
  };
}

export function ClinicList({
  clinics,
  loading,
  onUpdate,
}: {
  clinics: Clinic[];
  loading: boolean;
  onUpdate: () => void;
}) {
  const t = useClinicListTranslations();
  if (loading) return (
      <div className="flex h-24 items-center justify-center text-muted-foreground">
        {t("loadingLabel")}
      </div>
    );

  if (clinics.length === 0) return (
      <div className="ui-panel-muted flex flex-col items-center justify-center h-64 text-center">
        <Building2 className="h-10 w-10 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">{t("emptyTitle")}</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {t("emptyHint")}
        </p>
      </div>
    );

  return (
    <div className="ui-card-surface overflow-x-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("colName")}</TableHead>
            <TableHead>{t("colContact")}</TableHead>
            <TableHead>{t("colTier")}</TableHead>
            <TableHead>{t("colType")}</TableHead>
            <TableHead>{t("colUsers")}</TableHead>
            <TableHead>{t("colPatients")}</TableHead>
            <TableHead>{t("colStatus")}</TableHead>
            <TableHead className="text-right">{t("colActions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.isArray(clinics) &&
            clinics.map((clinic) => (
              <TableRow key={clinic.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border/70 bg-background/70 text-xs font-bold text-primary">
                      {clinic.name.substring(0, 2).toUpperCase()}
                    </div>
                    {clinic.name}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col text-sm">
                    <span>{clinic.email || "-"}</span>
                    <span className="text-muted-foreground text-xs">
                      {clinic.phone || "-"}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={getTierDisplay(clinic.tier || "GENERAL").className}
                  >
                    {getTierDisplay(clinic.tier || "GENERAL").name}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={getClinicTypeDisplay(clinic.type).className}
                  >
                    {getClinicTypeDisplay(clinic.type).name}
                  </Badge>
                </TableCell>
                <TableCell>{clinic._count?.users || 0}</TableCell>
                <TableCell>{clinic._count?.patients || 0}</TableCell>
                <TableCell>
                  <Badge variant={clinic.active ? "default" : "secondary"}>
                    {clinic.active ? t("statusActive") : t("statusInactive")}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <EditClinicDialog
                    clinic={{
                      ...clinic,
                      email: clinic.email ?? "",
                      phone: clinic.phone ?? "",
                      address: clinic.address ?? "",
                      tier: clinic.tier ?? "GENERAL",
                      active: clinic.active ?? true,
                      settings: clinic.settings,
                    }}
                    onClinicUpdated={onUpdate}
                  />
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </div>
  );
}
