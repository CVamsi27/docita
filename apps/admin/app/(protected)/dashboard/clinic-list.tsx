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

// Helper to normalize legacy tier names to new tier names
function normalizeTierName(tier: string): TierName {
  const legacyMapping: Record<string, TierName> = {
    FREE: "CAPTURE",
    STARTER: "CORE",
    PROFESSIONAL: "PRO",
  };
  return (legacyMapping[tier] || tier) as TierName;
}

// Helper to get tier info with fallback for unknown tiers
function getTierDisplay(tier: string): { name: string; color: string } {
  const normalizedTier = normalizeTierName(tier);
  const tierInfo = TIER_INFO[normalizedTier];
  if (tierInfo) {
    return {
      name: tierInfo.name.replace("Docita ", ""),
      color: tierInfo.color,
    };
  }
  return { name: tier, color: "gray" };
}

function getClinicTypeDisplay(type?: string) {
  const normalizedType = (type || "GENERAL").toUpperCase();
  const typeLabels: Record<string, { name: string; color: string }> = {
    GENERAL: { name: "General", color: "slate" },
    DENTAL: { name: "Dental", color: "cyan" },
    PEDIATRIC: { name: "Pediatric", color: "pink" },
    ORTHOPEDIC: { name: "Orthopedic", color: "blue" },
    CARDIOLOGY: { name: "Cardiology", color: "red" },
    DERMATOLOGY: { name: "Dermatology", color: "amber" },
    ENT: { name: "ENT", color: "teal" },
    GYNECOLOGY: { name: "Gynecology", color: "purple" },
    OPHTHALMOLOGY: { name: "Ophthalmology", color: "indigo" },
    PSYCHIATRY: { name: "Psychiatry", color: "violet" },
    SPECIALTY: { name: "Specialty", color: "emerald" },
  };
  return typeLabels[normalizedType] || { name: "General", color: "slate" };
}

interface Clinic {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  tier: string;
  type?: string;
  active: boolean;
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
            <TableHead>Tier</TableHead> <TableHead>Type</TableHead>{" "}
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
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                      {clinic.name.substring(0, 2).toUpperCase()}
                    </div>
                    {clinic.name}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col text-sm">
                    <span>{clinic.email}</span>
                    <span className="text-muted-foreground text-xs">
                      {clinic.phone}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={`
                    ${getTierDisplay(clinic.tier).color === "gray" ? "border-gray-400 text-gray-600" : ""}
                    ${getTierDisplay(clinic.tier).color === "blue" ? "border-blue-400 text-blue-600" : ""}
                    ${getTierDisplay(clinic.tier).color === "green" ? "border-green-400 text-green-600" : ""}
                    ${getTierDisplay(clinic.tier).color === "purple" ? "border-purple-400 text-purple-600" : ""}
                    ${getTierDisplay(clinic.tier).color === "orange" ? "border-orange-400 text-orange-600" : ""}
                    ${getTierDisplay(clinic.tier).color === "pink" ? "border-pink-400 text-pink-600" : ""}
                  `}
                  >
                    {getTierDisplay(clinic.tier).name}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={`
                    ${getClinicTypeDisplay(clinic.type).color === "slate" ? "border-slate-400 text-slate-600" : ""}
                    ${getClinicTypeDisplay(clinic.type).color === "cyan" ? "border-cyan-400 text-cyan-600" : ""}
                    ${getClinicTypeDisplay(clinic.type).color === "pink" ? "border-pink-400 text-pink-600" : ""}
                    ${getClinicTypeDisplay(clinic.type).color === "blue" ? "border-blue-400 text-blue-600" : ""}
                    ${getClinicTypeDisplay(clinic.type).color === "red" ? "border-red-400 text-red-600" : ""}
                    ${getClinicTypeDisplay(clinic.type).color === "amber" ? "border-amber-400 text-amber-600" : ""}
                    ${getClinicTypeDisplay(clinic.type).color === "teal" ? "border-teal-400 text-teal-600" : ""}
                    ${getClinicTypeDisplay(clinic.type).color === "purple" ? "border-purple-400 text-purple-600" : ""}
                    ${getClinicTypeDisplay(clinic.type).color === "indigo" ? "border-indigo-400 text-indigo-600" : ""}
                    ${getClinicTypeDisplay(clinic.type).color === "violet" ? "border-violet-400 text-violet-600" : ""}
                    ${getClinicTypeDisplay(clinic.type).color === "emerald" ? "border-emerald-400 text-emerald-600" : ""}
                  `}
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
                    clinic={clinic}
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
