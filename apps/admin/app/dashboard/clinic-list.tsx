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

interface Clinic {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  tier: string;
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
            <TableHead>Tier</TableHead>
            <TableHead>Users</TableHead>
            <TableHead>Patients</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clinics.map((clinic) => (
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
              <TableCell>{clinic._count?.users || 0}</TableCell>
              <TableCell>{clinic._count?.patients || 0}</TableCell>
              <TableCell>
                <Badge variant={clinic.active ? "default" : "secondary"}>
                  {clinic.active ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <EditClinicDialog clinic={clinic} onClinicUpdated={onUpdate} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
