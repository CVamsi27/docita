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
import { DataState } from "@workspace/ui/components/data-display/data-state";

import type { InternalClinicListEntry } from "@workspace/types";

export function ClinicList({
  clinics,
  loading,
  filtered = false,
  onUpdate,
}: {
  clinics: InternalClinicListEntry[];
  loading: boolean;
  filtered?: boolean;
  onUpdate: () => void;
}) {
  if (loading || clinics.length === 0)
    return (
      <DataState
        status={loading ? "loading" : "empty"}
        loadingMessage="Loading facilities…"
        emptyIcon={Building2}
        emptyTitle={filtered ? "No matching facilities" : "No facilities yet"}
        emptyDescription={
          filtered
            ? "Try another search on this page, or browse the next page."
            : "Add your first facility to get started."
        }
      />
    );

  return (
    <div className="overflow-x-hidden">
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
          {clinics.map((clinic) => (
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
                <Badge variant="outline">{clinic.tier || "STARTER"}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{clinic.type || "GENERAL"}</Badge>
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
                    tier: clinic.tier ?? "STARTER",
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
