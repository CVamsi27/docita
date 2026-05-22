"use client";

import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";

import { Button } from "@workspace/ui/components/form/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Input } from "@workspace/ui/components/form/input";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { EmptyState } from "@workspace/ui/components/feedback/empty-state";
import { PageHeader } from "@workspace/ui/components/layout/page-header";
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
import { Eye, Search, Users } from "lucide-react";
import {
  formatInternalListDate,
  formatInternalTimestamp,
} from "@/lib/formatters/format-display-date";
import { ROLE_CONFIG } from "./types";
import {
  getRoleBadgeColor,
  getSpecializationLabel,
  isRoleConfigKey,
} from "./utils";
import { useUsersData } from "./use-users-data";

export function UsersPageContainer() {
  const {
    clinics,
    users,
    filteredUsers,
    roleStats,
    loading,
    hasError,
    errorMessage,
    searchTerm,
    selectedClinic,
    selectedRole,
    selectedUser,
    isViewOpen,
    setSearchTerm,
    setSelectedClinic,
    setSelectedRole,
    setIsViewOpen,
    handleViewUser,
    retry,
  } = useUsersData();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team Members"
        description="View and manage all users across facilities"
        size="compact"
      />

      {hasError && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex flex-col gap-3 pt-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-medium text-destructive">
                We could not load your team members
              </p>
              <p className="text-sm text-muted-foreground">{errorMessage}</p>
            </div>
            <Button variant="outline" onClick={() => void retry()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

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
                setSelectedRole(role);
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

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Enter name, email, or specialization"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={selectedClinic} onValueChange={setSelectedClinic}>
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Members ({filteredUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div
              className="flex items-center justify-center py-8"
              role="status"
              aria-live="polite"
              aria-label="Loading team members"
            >
              <DocitaLoadingIndicator
                variant="section"
                withStatusRole={false}
                iconClassName="h-8 w-8 text-primary"
              />
            </div>
          ) : filteredUsers.length === 0 ? (
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
                          onClick={() => handleViewUser(user)}
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

      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              Review team member contact details and professional credentials.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Name
                  </p>
                  <p className="text-sm font-semibold mt-1">
                    {selectedUser.name}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Email
                  </p>
                  <p className="text-sm font-semibold mt-1">
                    {selectedUser.email}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Role
                  </p>
                  <div className="mt-1">
                    <Badge className={getRoleBadgeColor(selectedUser.role)}>
                      {selectedUser.role.replace("_", " ")}
                    </Badge>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Phone Number
                  </p>
                  <p className="text-sm font-semibold mt-1">
                    {selectedUser.phoneNumber || "N/A"}
                  </p>
                </div>
              </div>

              {(selectedUser.role === "DOCTOR" ||
                selectedUser.role === "ADMIN_DOCTOR") && (
                <>
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-3">
                      Professional Information
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedUser.specialization && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            Specialization
                          </p>
                          <p className="text-sm font-semibold mt-1">
                            {getSpecializationLabel(selectedUser.specialization)}
                          </p>
                        </div>
                      )}
                      {selectedUser.qualification && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            Qualification
                          </p>
                          <p className="text-sm font-semibold mt-1">
                            {selectedUser.qualification}
                          </p>
                        </div>
                      )}
                      {selectedUser.registrationNumber && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            Registration Number
                          </p>
                          <p className="text-sm font-semibold mt-1">
                            {selectedUser.registrationNumber}
                          </p>
                        </div>
                      )}
                      {selectedUser.yearsOfExperience !== undefined && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            Experience
                          </p>
                          <p className="text-sm font-semibold mt-1">
                            {selectedUser.yearsOfExperience} years
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  {selectedUser.bio && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Bio
                      </p>
                      <p className="text-sm mt-1">{selectedUser.bio}</p>
                    </div>
                  )}
                </>
              )}

              <div className="border-t pt-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Joined
                </p>
                <p className="text-sm font-semibold mt-1">
                  {formatInternalTimestamp(selectedUser.createdAt)}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
