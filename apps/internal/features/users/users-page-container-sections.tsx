"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/data-display/table-essentials";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, EmptyState } from "@workspace/ui/components";
import { useTranslations } from "next-intl";
import { InternalTableToolbar } from "@/components/common/internal-table-toolbar";
import { Eye, Users } from "lucide-react";
import { formatInternalListDate } from "@/lib/formatters/format-internal-list-date";
import { formatInternalTimestamp } from "@/lib/formatters/format-internal-timestamp";
import { ROLE_CONFIG, type RoleFilter, type User } from "./types";
import {
  getRoleBadgeColor,
  getSpecializationLabel,
  isRoleConfigKey,
} from "./utils";

/**
 * Phase 3 (per-feature): apps/internal Users > Page sections
 * (stats cards, search filter, table, details dialog). 9 literals
 * converted to useTranslations("InternalUsers").
 */
function useUsersPageTranslations() {
  return useTranslations("InternalUsers");
}

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
  const t = useUsersPageTranslations();
  return (
    <InternalTableToolbar
      searchValue={searchTerm}
      onSearchChange={onSearchChange}
      searchPlaceholder={t("searchPlaceholder")}
      filterValue={selectedClinic}
      onFilterChange={onClinicChange}
      filterOptions={clinics.map((clinic) => ({
        value: clinic.id,
        label: clinic.name,
      }))}
      filterPlaceholder={t("facilityPlaceholder")}
      filterAllLabel={t("allFacilities")}
      filterAriaLabel={t("filterByFacilityAriaLabel")}
    />
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
  const t = useUsersPageTranslations();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          {t("teamMembersTitle", { count: filteredUsers.length })}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {filteredUsers.length === 0 ? (
          <EmptyState
            icon={Users}
            title={
              users.length === 0
                ? t("noTeamMembersTitle")
                : t("noMatchingUsersTitle")
            }
            description={t("emptyDescription")}
          />
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("colName")}</TableHead>
                  <TableHead>{t("colEmail")}</TableHead>
                  <TableHead>{t("colRole")}</TableHead>
                  <TableHead>{t("colSpecialization")}</TableHead>
                  <TableHead>{t("colPhone")}</TableHead>
                  <TableHead>{t("colJoined")}</TableHead>
                  <TableHead className="text-right">{t("colActions")}</TableHead>
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
                        {t("viewButton")}
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
  const t = useUsersPageTranslations();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("userDetailsTitle")}</DialogTitle>
          <DialogDescription>
            {t("userDetailsDescription")}
          </DialogDescription>
        </DialogHeader>
        {user && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t("fieldName")}
                </p>
                <p className="text-sm font-semibold mt-1">{user.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t("fieldEmail")}
                </p>
                <p className="text-sm font-semibold mt-1">{user.email}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t("fieldRole")}
                </p>
                <div className="mt-1">
                  <Badge className={getRoleBadgeColor(user.role)}>
                    {user.role.replace("_", " ")}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t("fieldPhoneNumber")}
                </p>
                <p className="text-sm font-semibold mt-1">
                  {user.phoneNumber || t("notAvailable")}
                </p>
              </div>
            </div>

            {(user.role === "DOCTOR" ||
              user.role === "ADMIN_DOCTOR") && (
              <>
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">
                    {t("professionalInfoTitle")}
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {user.specialization && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          {t("fieldSpecialization")}
                        </p>
                        <p className="text-sm font-semibold mt-1">
                          {getSpecializationLabel(user.specialization)}
                        </p>
                      </div>
                    )}
                    {user.qualification && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          {t("fieldQualification")}
                        </p>
                        <p className="text-sm font-semibold mt-1">
                          {user.qualification}
                        </p>
                      </div>
                    )}
                    {user.registrationNumber && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          {t("fieldRegistrationNumber")}
                        </p>
                        <p className="text-sm font-semibold mt-1">
                          {user.registrationNumber}
                        </p>
                      </div>
                    )}
                    {user.yearsOfExperience !== undefined && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          {t("fieldExperience")}
                        </p>
                        <p className="text-sm font-semibold mt-1">
                          {t("yearsValue", { count: user.yearsOfExperience })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                {user.bio && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {t("fieldBio")}
                    </p>
                    <p className="text-sm mt-1">{user.bio}</p>
                  </div>
                )}
              </>
            )}

            <div className="border-t pt-4">
              <p className="text-sm font-medium text-muted-foreground">
                {t("fieldJoined")}
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
