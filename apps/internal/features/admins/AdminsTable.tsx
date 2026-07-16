"use client";

// jscpd:ignore-start
import {
  Edit2,
  Eye,
  Shield,
  UserCheck,
  UserX,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@workspace/ui/components/form/button";
import { Badge } from "@workspace/ui/components/indicators/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/data-display/table";
import {
  Card,
// jscpd:ignore-end
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { EmptyState } from "@workspace/ui/components/feedback/empty-state";
import { formatInternalListDate } from "@/lib/formatters/format-internal-list-date";
import type { Admin } from "./use-admins-page";

interface AdminsTableProps {
  admins: Admin[];
  selectedClinic: string;
  onView: (admin: Admin) => void;
  onEdit: (admin: Admin) => void;
  onDeactivate: (adminId: string) => void;
  onActivate: (adminId: string) => void;
  getRoleLabel: (role: string) => string;
  getRoleBadgeVariant: (role: string) => "default" | "outline";
}

/**
 * Phase 3 (per-feature): apps/internal Admins > Admins table.
 * 11 literals converted to useTranslations
 * (\"InternalAdmins.table\") — card title, empty state, table
 * headers, status badges, action screen-reader labels.
 */
function useAdminsTableTranslations() {
  return useTranslations("InternalAdmins.table");
}

export function AdminsTable({
  admins,
  selectedClinic,
  onView,
  onEdit,
  onDeactivate,
  onActivate,
  getRoleLabel,
  getRoleBadgeVariant,
}: AdminsTableProps) {
  const t = useAdminsTableTranslations();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          {t("cardTitle", { count: admins.length })}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {admins.length === 0 ? (
          <EmptyState
            icon={Shield}
            title={
              selectedClinic
                ? t("emptyTitleNoAdmins")
                : t("emptyTitleSelectClinic")
            }
            description={
              selectedClinic
                ? t("emptyDescriptionNoAdmins")
                : t("emptyDescriptionSelectClinic")
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("colName")}</TableHead>
                <TableHead>{t("colEmail")}</TableHead>
                <TableHead>{t("colPhone")}</TableHead>
                <TableHead>{t("colType")}</TableHead>
                <TableHead>{t("colAccess")}</TableHead>
                <TableHead>{t("colCreated")}</TableHead>
                <TableHead>{t("colActions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.map((admin) => (
                <TableRow key={admin.id}>
                  <TableCell className="font-medium">{admin.name}</TableCell>
                  <TableCell>{admin.email}</TableCell>
                  <TableCell>
                    {admin.phoneNumber || (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(admin.role)}>
                      {getRoleLabel(admin.role)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {admin.appLoginDisabled ? (
                      <Badge variant="destructive">{t("accessDisabled")}</Badge>
                    ) : (
                      <Badge variant="secondary">{t("accessActive")}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {formatInternalListDate(admin.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onView(admin)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(admin)}
                        disabled={admin.appLoginDisabled}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      {admin.appLoginDisabled ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onActivate(admin.id)}
                        >
                          <UserCheck className="h-4 w-4" />
                          <span className="sr-only">{t("reenableAdminSrLabel")}</span>
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => onDeactivate(admin.id)}
                        >
                          <UserX className="h-4 w-4" />
                          <span className="sr-only">{t("deactivateAdminSrLabel")}</span>
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
