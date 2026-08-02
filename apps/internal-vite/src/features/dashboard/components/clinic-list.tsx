import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/data-display/table";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { EditClinicDialog } from "./edit-clinic-dialog";
import { Building2 } from "lucide-react";

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
  _count?: { users: number; patients: number };
}

export function ClinicList({ clinics, loading, onUpdate }: { clinics: Clinic[]; loading: boolean; onUpdate: () => void }) {
  if (loading) return <div className="flex h-24 items-center justify-center text-muted-foreground">Loading facilities\u2026</div>;
  if (clinics.length === 0) return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <Building2 className="h-10 w-10 text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium">No facilities yet</h3>
      <p className="text-sm text-muted-foreground mt-1">Add your first facility to get started.</p>
    </div>
  );

  return (
    <div className="overflow-x-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead><TableHead>Contact</TableHead><TableHead>Tier</TableHead>
            <TableHead>Type</TableHead><TableHead>Users</TableHead><TableHead>Patients</TableHead>
            <TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clinics.map((clinic) => (
            <TableRow key={clinic.id}>
              <TableCell className="font-medium"><div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border/70 bg-background/70 text-xs font-bold text-primary">
                  {clinic.name.substring(0, 2).toUpperCase()}</div>{clinic.name}</div></TableCell>
              <TableCell><div className="flex flex-col text-sm"><span>{clinic.email || "-"}</span>
                <span className="text-muted-foreground text-xs">{clinic.phone || "-"}</span></div></TableCell>
              <TableCell><Badge variant="outline">{clinic.tier || "STARTER"}</Badge></TableCell>
              <TableCell><Badge variant="outline">{clinic.type || "GENERAL"}</Badge></TableCell>
              <TableCell>{clinic._count?.users || 0}</TableCell>
              <TableCell>{clinic._count?.patients || 0}</TableCell>
              <TableCell><Badge variant={clinic.active ? "default" : "secondary"}>{clinic.active ? "Active" : "Inactive"}</Badge></TableCell>
              <TableCell className="text-right">
                <EditClinicDialog clinic={{ ...clinic, email: clinic.email ?? "", phone: clinic.phone ?? "", address: clinic.address ?? "", tier: clinic.tier ?? "STARTER", active: clinic.active ?? true }} onClinicUpdated={onUpdate} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
