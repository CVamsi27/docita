import { Edit2, Eye, Shield, UserCheck, UserX } from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/data-display/table";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/indicators/card";
import { EmptyState } from "@workspace/ui/components/feedback/empty-state";
import { formatDate, enIN } from "@workspace/utils";

interface Admin { id: string; name: string; email: string; phoneNumber?: string; role: string; appLoginDisabled: boolean; createdAt: string; }

interface AdminsTableProps {
  admins: Admin[]; selectedClinic: string;
  onView: (admin: Admin) => void; onEdit: (admin: Admin) => void;
  onDeactivate: (admin: Admin) => void; onActivate: (adminId: string) => void;
  getRoleLabel: (role: string) => string; getRoleBadgeVariant: (role: string) => "default" | "outline";
}

export function AdminsTable({ admins, selectedClinic, onView, onEdit, onDeactivate, onActivate, getRoleLabel, getRoleBadgeVariant }: AdminsTableProps) {
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Admins ({admins.length})</CardTitle></CardHeader>
      <CardContent>
        {admins.length === 0 ? (
          <EmptyState icon={Shield} title={selectedClinic ? "No admins found" : "Select a facility"}
            description={selectedClinic ? "No administrators for this facility." : "Choose a facility to view its admins."} />
        ) : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead>
              <TableHead>Type</TableHead><TableHead>Access</TableHead><TableHead>Created</TableHead><TableHead className="text-right">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {admins.map((admin) => (
                <TableRow key={admin.id}>
                  <TableCell className="font-medium">{admin.name}</TableCell>
                  <TableCell>{admin.email}</TableCell>
                  <TableCell>{admin.phoneNumber || <span className="text-muted-foreground">-</span>}</TableCell>
                  <TableCell><Badge variant={getRoleBadgeVariant(admin.role)}>{getRoleLabel(admin.role)}</Badge></TableCell>
                  <TableCell>{admin.appLoginDisabled ? <Badge variant="destructive">Disabled</Badge> : <Badge variant="secondary">Active</Badge>}</TableCell>
                  <TableCell>{formatDate(admin.createdAt, undefined, { locale: enIN })}</TableCell>
                  <TableCell><div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => { onView(admin); }}><Eye className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => { onEdit(admin); }} disabled={admin.appLoginDisabled}><Edit2 className="h-4 w-4" /></Button>
                    {admin.appLoginDisabled ? (
                      <Button variant="ghost" size="sm" onClick={() => { onActivate(admin.id); }}><UserCheck className="h-4 w-4" /></Button>
                    ) : (
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => { onDeactivate(admin); }}><UserX className="h-4 w-4" /></Button>
                    )}
                  </div></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
