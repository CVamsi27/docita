"use client";

import { Button } from "@workspace/ui/components/form/button";
// jscpd:ignore-start
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Input } from "@workspace/ui/components/form/input";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { EmptyState } from "@workspace/ui/components/feedback/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/data-display/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/overlay/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
// jscpd:ignore-end
import { Eye, Search, Users } from "lucide-react";
import { formatInternalListDate } from "@/lib/formatters/format-internal-list-date";
import { formatInternalTimestamp } from "@/lib/formatters/format-internal-timestamp";
import { ROLE_CONFIG, type RoleFilter, type User } from "./types";
import {
  getRoleBadgeColor,
  getSpecializationLabel,
  isRoleConfigKey,
} from "./utils";

interface UserStatsCardsProps {
  roleStats: Record<string, number>;
  selectedRole: RoleFilter;
  onRoleSelect: (role: RoleFilter) => void;
}

export function UserStatsCards({
  roleStats,
  selectedRole,
  onRoleSelect,
}: UserStatsCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-5">
      {Object.entries(ROLE_CONFIG).map(([role, config]) => (
        <Card
          key={role}
          className={`cursor-pointer transition-shadow duration-150 ${
            selectedRole === role
              ? "ring-2 ring-primary shadow-lg"
              : "hover:shadow-md"
          }`}
          onClick={() => {
            if (isRoleConfigKey(role)) {
              onRoleSelect(role);
            }
          }}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {config.label}
                </p>
                <p className="mt-1 text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
                  {isRoleConfigKey(role) ? roleStats[role] : 0}
                </p>
              </div>
              <config.icon className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

interface SearchFilterBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedClinic: string;
  onClinicChange: (value: string) => void;
  clinics: Array<{ id: string; name: string }>;
}

export function SearchFilterBar({
  searchTerm,
  onSearchChange,
  selectedClinic,
  onClinicChange,
  clinics,
}: SearchFilterBarProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Enter name, email, or specialization"
                value={searchTerm}
                onChange={(event) => onSearchChange(event.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <Select value={selectedClinic} onValueChange={onClinicChange}>
            <SelectTrigger
              className="w-full md:w-[250px]"
              aria-label="Filter by facility"
            >
              <SelectValue placeholder="Facility" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Facilities</SelectItem>
              {clinics.map((clinic) => (
                <SelectItem key={clinic.id} value={clinic.id}>
                  {clinic.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}

interface UsersTableSectionProps {
  filteredUsers: User[];
  users: User[];
  onViewUser: (user: User) => void;
}

export function UsersTableSection({
  filteredUsers,
  users,
  onViewUser,
}: UsersTableSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Team Members ({filteredUsers.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {filteredUsers.length === 0 ? (
          <EmptyState
            icon={Users}
            title={
              users.length === 0
                ? "No team members found"
                : "No users match your search criteria"
            }
            description="Try adjusting the facility filter or search query."
          />
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Specialization</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.email}
                    </TableCell>
                    <TableCell>
                      <Badge className={getRoleBadgeColor(user.role)}>
                        {user.role.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {getSpecializationLabel(user.specialization)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.phoneNumber || "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatInternalListDate(user.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewUser(user)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface UserDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
}

export function UserDetailsDialog({
  open,
  onOpenChange,
  user,
}: UserDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>User Details</DialogTitle>
          <DialogDescription>
            Review team member contact details and professional credentials.
          </DialogDescription>
        </DialogHeader>
        {user && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Name
                </p>
                <p className="text-sm font-semibold mt-1">{user.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Email
                </p>
                <p className="text-sm font-semibold mt-1">{user.email}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Role
                </p>
                <div className="mt-1">
                  <Badge className={getRoleBadgeColor(user.role)}>
                    {user.role.replace("_", " ")}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Phone Number
                </p>
                <p className="text-sm font-semibold mt-1">
                  {user.phoneNumber || "N/A"}
                </p>
              </div>
            </div>

            {(user.role === "DOCTOR" ||
              user.role === "ADMIN_DOCTOR") && (
              <>
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">
                    Professional Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {user.specialization && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Specialization
                        </p>
                        <p className="text-sm font-semibold mt-1">
                          {getSpecializationLabel(user.specialization)}
                        </p>
                      </div>
                    )}
                    {user.qualification && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Qualification
                        </p>
                        <p className="text-sm font-semibold mt-1">
                          {user.qualification}
                        </p>
                      </div>
                    )}
                    {user.registrationNumber && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Registration Number
                        </p>
                        <p className="text-sm font-semibold mt-1">
                          {user.registrationNumber}
                        </p>
                      </div>
                    )}
                    {user.yearsOfExperience !== undefined && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Experience
                        </p>
                        <p className="text-sm font-semibold mt-1">
                          {user.yearsOfExperience} years
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                {user.bio && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Bio
                    </p>
                    <p className="text-sm mt-1">{user.bio}</p>
                  </div>
                )}
              </>
            )}

            <div className="border-t pt-4">
              <p className="text-sm font-medium text-muted-foreground">
                Joined
              </p>
              <p className="text-sm font-semibold mt-1">
                {formatInternalTimestamp(user.createdAt)}
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
