"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Badge } from "@workspace/ui/components/badge";
import { EditClinicDialog } from "./edit-clinic-dialog";
import { Building2 } from "lucide-react";
import { TIER_INFO, type TierName } from "@workspace/types";

function normalizeTierName(tier: string): TierName {
  const legacyMapping: Record<string, TierName> = {
    FREE: "STARTER",
    CAPTURE: "STARTER",
    CORE: "ESSENTIAL",
    PLUS: "ESSENTIAL",
    PRO: "PROFESSIONAL",
    CLINIC: "PROFESSIONAL",
  };
  return (legacyMapping[tier] || tier) as TierName;
}

function getTierDisplay(tier: string): { name: string; className: string } {
  const normalizedTier = normalizeTierName(tier);
  const tierInfo = TIER_INFO[normalizedTier];
  if (tierInfo) {
    const tierClassMap: Record<string, string> = {
      gray: "tier-capture",
      blue: "tier-core",
      purple: "tier-pro",
      orange: "tier-enterprise",
      pink: "tier-intelligence",
    };

    return {
      name: tierInfo.name.replace("Docita ", ""),
      className: tierClassMap[tierInfo.color] || "tier-capture",
    };
  }
  return { name: tier, className: "tier-capture" };
}

function getClinicTypeDisplay(type?: string) {
  const normalizedType = (type || "GENERAL").toUpperCase();
  const typeLabels: Record<string, { name: string; className: string }> = {
    GENERAL: { name: "General", className: "badge-muted" },
    DENTAL: { name: "Dental", className: "badge-info" },
    PEDIATRIC: { name: "Pediatric", className: "tier-intelligence" },
    ORTHOPEDIC: { name: "Orthopedic", className: "tier-core" },
    CARDIOLOGY: { name: "Cardiology", className: "badge-danger" },
    DERMATOLOGY: { name: "Dermatology", className: "badge-warning" },
    ENT: { name: "ENT", className: "tier-plus" },
    GYNECOLOGY: { name: "Gynecology", className: "tier-pro" },
    OPHTHALMOLOGY: { name: "Ophthalmology", className: "tier-core" },
    PSYCHIATRY: { name: "Psychiatry", className: "tier-pro" },
    SPECIALTY: { name: "Specialty", className: "tier-plus" },
  };
  return typeLabels[normalizedType] || { name: "General", className: "badge-muted" };
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
  if (loading) {
    return (
      <div className="flex h-24 items-center justify-center text-muted-foreground">
        Loading clinics...
      </div>
    );
  }

  if (clinics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center border rounded-md bg-muted/10">
        <Building2 className="h-10 w-10 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">No clinics found</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Get started by creating a new clinic.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Tier</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Users</TableHead>
            <TableHead>Patients</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.isArray(clinics) &&
            clinics.map((clinic) => (
              <TableRow key={clinic.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
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
                    {clinic.active ? "Active" : "Inactive"}
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
