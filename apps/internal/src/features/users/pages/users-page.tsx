import { useState, useMemo } from "react";
import { AppPageScaffold, Badge, Button, Card, CardContent, CardHeader, CardTitle, DataState, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, Input, PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components";
import { Eye, Search, Shield, Stethoscope, UserCog, Users } from "lucide-react";
import { EmptyState } from "@workspace/ui/components/feedback/empty-state";
import { formatDate, formatDateTime, enIN } from "@workspace/utils";
import { useApiQuery } from "@/hooks/use-api-query";

interface User { id: string; name: string; email: string; role: string; phoneNumber?: string; specialization?: string; qualification?: string; registrationNumber?: string; yearsOfExperience?: number; bio?: string; createdAt: string; clinicName?: string; }

const ROLE_FILTERS = [
  "ALL",
  "ADMIN",
  "ADMIN_DOCTOR",
  "DOCTOR",
  "RECEPTIONIST",
] as const;
type RoleFilter = (typeof ROLE_FILTERS)[number];

const ROLE_CONFIG: Record<RoleFilter, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  ALL: { label: "All Users", icon: Users },
  ADMIN: { label: "Clinic Admins", icon: Shield },
  ADMIN_DOCTOR: { label: "Admin Doctors", icon: UserCog },
  DOCTOR: { label: "Doctors", icon: Stethoscope },
  RECEPTIONIST: { label: "Receptionists", icon: Users },
};

function getRoleBadgeColor(role: string): string {
  const colors: Record<string, string> = {
    ADMIN: "badge-info",
    // Purple has no semantic token; ADMIN_DOCTOR reads as the neutral "combined" role.
    ADMIN_DOCTOR: "badge-muted",
    DOCTOR: "badge-success",
    // badge-warning (amber) is the sanctioned stand-in for the legacy orange.
    RECEPTIONIST: "badge-warning",
  };
  return colors[role] ?? "";
}

export function UsersPage() {
  const { data: users = [], isLoading, error, refetch } = useApiQuery<User[]>("/api/internal/users");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState<RoleFilter>("ALL");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  const roleStats = useMemo(() => ({
    ALL: users.length, ADMIN: users.filter((u) => u.role === "ADMIN").length,
    ADMIN_DOCTOR: users.filter((u) => u.role === "ADMIN_DOCTOR").length,
    DOCTOR: users.filter((u) => u.role === "DOCTOR").length,
    RECEPTIONIST: users.filter((u) => u.role === "RECEPTIONIST").length,
  }), [users]);

  const filteredUsers = useMemo(() => users.filter((u) => {
    const matchesSearch = !searchTerm || u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch && (selectedRole === "ALL" || u.role === selectedRole);
  }), [users, searchTerm, selectedRole]);

  return (
    <AppPageScaffold header={<PageHeader title="Team Members" description="View and manage all users across facilities" size="compact" />}>
      <DataState status={isLoading ? "loading" : error ? "error" : "success"} loadingMessage="Loading team members…"
        errorMessage="We could not load team members. Please refresh and try again."
        onRetry={() => { void refetch(); }}
        emptyTitle="No team members found" emptyDescription="Team members will appear here once facilities add users." emptyIcon={Users}>
        <div className="grid gap-4 md:grid-cols-5 mb-6">
          {ROLE_FILTERS.map((role) => { const config = ROLE_CONFIG[role]; return (
            <Card key={role} className={`cursor-pointer transition-shadow duration-150 ${selectedRole === role ? "ring-2 ring-primary shadow-lg" : "hover:shadow-md"}`}
              onClick={() => { setSelectedRole(role); }}>
              <CardContent className="pt-6"><div className="flex items-center justify-between">
                <div><p className="text-sm font-medium text-muted-foreground">{config.label}</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums">{roleStats[role]}</p></div>
                <config.icon className="h-8 w-8 text-muted-foreground" />
              </div>              </CardContent></Card>
          ); })}
        </div>

        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name, email…" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); }} className="pl-10" />
          </div>
        </div>

        <Card><CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Team Members ({filteredUsers.length})</CardTitle></CardHeader>
          <CardContent>
            {filteredUsers.length === 0 ? (
              <EmptyState icon={Users} title={users.length === 0 ? "No team members yet" : "No matching users"} description="Users will appear here once facilities are set up." />
            ) : (
              <div className="rounded-md border"><Table><TableHeader><TableRow>
                <TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Specialization</TableHead><TableHead>Phone</TableHead><TableHead>Joined</TableHead><TableHead className="text-right">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>{filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell><Badge className={getRoleBadgeColor(user.role)}>{user.role.replace("_", " ")}</Badge></TableCell>
                  <TableCell className="text-muted-foreground">{user.specialization || "-"}</TableCell>
                  <TableCell className="text-muted-foreground">{user.phoneNumber || "-"}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(user.createdAt, undefined, { locale: enIN })}</TableCell>
                  <TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => { setSelectedUser(user); setIsViewOpen(true); }}><Eye className="h-4 w-4 mr-2" /> View</Button></TableCell>
                </TableRow>
              ))}</TableBody></Table></div>
            )}
          </CardContent>
        </Card>
      </DataState>

      <Dialog open={isViewOpen} onOpenChange={(o) => { setIsViewOpen(o); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>User Details</DialogTitle><DialogDescription>Complete user profile information</DialogDescription></DialogHeader>
          {selectedUser && <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-sm font-medium text-muted-foreground">Name</p><p className="text-sm font-semibold mt-1">{selectedUser.name}</p></div>
              <div><p className="text-sm font-medium text-muted-foreground">Email</p><p className="text-sm font-semibold mt-1">{selectedUser.email}</p></div>
              <div><p className="text-sm font-medium text-muted-foreground">Role</p><Badge className={`mt-1 ${getRoleBadgeColor(selectedUser.role)}`}>{selectedUser.role.replace("_", " ")}</Badge></div>
              <div><p className="text-sm font-medium text-muted-foreground">Phone</p><p className="text-sm font-semibold mt-1">{selectedUser.phoneNumber || "N/A"}</p></div>
            </div>
            <div className="border-t pt-4"><p className="text-sm font-medium text-muted-foreground">Joined</p><p className="text-sm font-semibold mt-1">{formatDateTime(selectedUser.createdAt, undefined, { locale: enIN })}</p></div>
          </div>}
        </DialogContent>
      </Dialog>
    </AppPageScaffold>
  );
}
